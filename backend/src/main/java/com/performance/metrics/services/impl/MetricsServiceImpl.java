package com.performance.metrics.services.impl;

import com.performance.metrics.clients.AthenaMcpClient;
import com.performance.metrics.dto.*;
import com.performance.metrics.services.ExcelService;
import com.performance.metrics.services.MetricsService;
import com.performance.metrics.services.S3Service;
import com.performance.metrics.services.TemporaryFileStorageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class MetricsServiceImpl implements MetricsService {

    private static final String SALESFORCE_CASE_TABLE = "salesforce_crm_v2.\"case\" c";

    private static final String SALESFORCE_ACCOUNT_TABLE = "salesforce_crm_v2.account a";

    @Value("${temp.file.expiration.minutes:60}")
    private int fileExpirationMinutes;
    
    @Value("${server.servlet.context-path:}")
    private String contextPath;

    private final AthenaMcpClient athenaMcpClient;
    private final S3Service s3Service;
    private final ExcelService excelService;
    private final TemporaryFileStorageService fileStorageService;

    @Override
    public RunQueryResponse getSalesForceResponse(SalesForceQueryFilter filter) {
        String query = buildQuery(filter);
        log.info("query: {}",query);
        RunQueryRequest request = RunQueryRequest.builder()
                .query(query)
                .maxRows(10000)
                .build();
        return athenaMcpClient.runQuery(request);
    }

    @Override
    public ByteArrayOutputStream getSalesForceDataAsExcel(SalesForceQueryFilter filter) {
        try {
            // Step 1: Execute the query
            RunQueryResponse response = getSalesForceResponse(filter);
            log.info("Query executed successfully");

            // Step 2: Extract query execution ID from resource_link
            String queryExecutionId = extractQueryExecutionId(response);
            log.info("Extracted query execution ID: {}", queryExecutionId);

            // Step 3: Download CSV from S3
            InputStream csvInputStream = s3Service.downloadCsvFromS3(queryExecutionId);
            log.info("CSV downloaded from S3");

            // Step 4: Convert CSV to Excel
            ByteArrayOutputStream excelOutputStream = excelService.convertCsvToExcel(csvInputStream);
            log.info("CSV converted to Excel successfully");

            return excelOutputStream;
        } catch (Exception e) {
            log.error("Error generating Excel file: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to generate Excel file", e);
        }
    }

    private String extractQueryExecutionId(RunQueryResponse response) {
        try {
            List<ContentItem> contentItems = response.getResult()
                    .getStructuredContent()
                    .getResult()
                    .getContent();

            // Find the resource_link content item
            for (ContentItem item : contentItems) {
                if (item instanceof ResourceLinkContentItem) {
                    ResourceLinkContentItem resourceLinkItem = (ResourceLinkContentItem) item;
                    ResourceLink resourceLink = resourceLinkItem.getResource();
                    String uri = resourceLink.getUri();
                    
                    // Extract query execution ID from URI: athena://2b57bcd8-4c27-4fa0-be65-7b008b426d08
                    if (uri != null && uri.startsWith("athena://")) {
                        return uri.substring("athena://".length());
                    }
                }
            }

            throw new RuntimeException("Query execution ID not found in response");
        } catch (Exception e) {
            log.error("Error extracting query execution ID: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to extract query execution ID", e);
        }
    }

    private String buildQuery(SalesForceQueryFilter filter) {
        StringBuilder outerQuery=new StringBuilder();
        outerQuery.append("Select * from (");
        StringBuilder queryBuilder = new StringBuilder();
        queryBuilder.append("""
                SELECT c.id,c.products_available__c,c.casenumber,c.subject,c.description,c.status,c.priority,c.createddate,c.case_record_type__c,c.customer_segment__c,a.id AS account_id,a.name AS account_name,a.pan__c AS account_pan,a.industry AS account_industry,a.customer_type__c AS customer_type,a.final_segment__c AS segment,a.account_category__c AS account_category,a.turnover__c AS turnover,a.owner_email__c AS account_owner_email, a.arr_total_amount__c AS account_total_arr,ROW_NUMBER() OVER (PARTITION BY c.casenumber ORDER BY c.createddate DESC) AS rn FROM\s""").append(SALESFORCE_CASE_TABLE+" INNER JOIN "+SALESFORCE_ACCOUNT_TABLE+" ON a.id = c.accountid");

        List<String> conditions = new ArrayList<>();
        conditions.add("c.status IN ('Open','Pending')");
        conditions.add("c.isclosed = false");
        conditions.add("c.type = 'Feature'");
        // LAST 6 MONTHS DATA
        conditions.add("CAST(c.createddate AS TIMESTAMP) >= date_add('month', -6, current_timestamp)");

        if (filter.getCase_record_type__c() != null && !filter.getCase_record_type__c().isEmpty()) {
            conditions.add("c.case_record_type__c IN " + buildInClause(filter.getCase_record_type__c()));
        }

        if (filter.getCase_record_type__c() != null && !filter.getCase_record_type__c().isEmpty()) {
            conditions.add("c.customer_segment__c IN " + buildInClause(filter.getCase_record_type__c()));
        }

        if (filter.getType() != null && !filter.getType().isEmpty()) {
            conditions.add("c.type IN " + buildInClause(filter.getType()));
        }

        queryBuilder.append(" WHERE ");
        queryBuilder.append(String.join(" AND ", conditions));

        outerQuery.append(queryBuilder);
        outerQuery.append(") t WHERE rn = 1");

        return outerQuery.toString();
    }

    private String buildInClause(List<String> values) {
        List<String> escapedValues = values.stream()
                .map(v -> "'" + escapeSql(v) + "'")
                .toList();
        return "(" + String.join(", ", escapedValues) + ")";
    }

    private String escapeSql(String value) {
        if (value == null) {
            return null;
        }
        return value.replace("'", "''");
    }

    @Override
    public ExcelDownloadResponse getSalesForceDataAsExcelWithDownloadLink(SalesForceQueryFilter filter) {
        try {
            log.info("Generating Excel file with download link");
            
            // Step 1: Generate Excel file
            ByteArrayOutputStream excelOutputStream = getSalesForceDataAsExcel(filter);
            log.info("Excel file generated. Size: {} bytes", excelOutputStream.size());
            
            // Step 2: Store file temporarily
            String fileName = "salesforce_data.xlsx";
            String fileId = fileStorageService.storeFile(fileName, excelOutputStream);
            log.info("Excel file stored temporarily with ID: {}", fileId);
            
            // Step 3: Build download URL
            String downloadUrl = buildDownloadUrl(fileId);
            log.info("Download URL generated: {}", downloadUrl);
            
            // Step 4: Build response
            return ExcelDownloadResponse.builder()
                    .downloadUrl(downloadUrl)
                    .fileName(fileName)
                    .fileSizeBytes(excelOutputStream.size())
                    .expiresIn(fileExpirationMinutes + " minutes")
                    .message("Excel file generated successfully. Download link will expire in " + fileExpirationMinutes + " minutes.")
                    .build();
        } catch (Exception e) {
            log.error("Error generating Excel file with download link: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to generate Excel file with download link", e);
        }
    }
    
    private String buildDownloadUrl(String fileId) {
        // Build the download URL for the application server
        String baseUrl = contextPath.isEmpty() ? "" : contextPath;
        return baseUrl + "/public/metrics/downloadExcel/" + fileId;
    }
}
