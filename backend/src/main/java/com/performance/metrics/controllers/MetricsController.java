package com.performance.metrics.controllers;

import com.performance.metrics.dto.ContentItem;
import com.performance.metrics.dto.ExcelDownloadResponse;
import com.performance.metrics.dto.JsonContentItem;
import com.performance.metrics.dto.RunQueryResponse;
import com.performance.metrics.dto.SalesForceQueryFilter;
import com.performance.metrics.services.MetricsService;
import com.performance.metrics.services.TemporaryFileStorageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.ByteArrayOutputStream;
import java.util.Collections;
import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("public/metrics")
@RequiredArgsConstructor
public class MetricsController {

    @Autowired
    private final MetricsService metricsService;
    
    @Autowired
    private final TemporaryFileStorageService fileStorageService;

    @PostMapping("/getSalesForceData")
    public List<Map<String, Object>> fetchSalesForceData(
            @RequestHeader(value="x-workspace-id") String workspaceId,
            @RequestBody SalesForceQueryFilter queryFilter
    ){
        RunQueryResponse response = metricsService.getSalesForceResponse(queryFilter);

        List<ContentItem> contentItems = response.getResult()
                .getStructuredContent()
                .getResult()
                .getContent();

        return contentItems.stream()
                .filter(item -> item instanceof JsonContentItem)
                .map(item -> (JsonContentItem) item)
                .findFirst()
                .map(jsonItem -> jsonItem.getJson().getRows())
                .orElse(Collections.emptyList());
    }

    @PostMapping("/getSalesForceDataAsExcel")
    public ResponseEntity<ExcelDownloadResponse> downloadSalesForceDataAsExcel(
            @RequestHeader(value="x-workspace-id") String workspaceId,
            @RequestBody SalesForceQueryFilter queryFilter
    ){
        try {
            log.info("Generating Excel file with download link for workspace: {}", workspaceId);
            
            ExcelDownloadResponse response = metricsService.getSalesForceDataAsExcelWithDownloadLink(queryFilter);
            
            log.info("Excel file generated successfully. Download URL: {}", response.getDownloadUrl());
            
            return ResponseEntity.ok()
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(response);
        } catch (Exception e) {
            log.error("Error generating Excel file: {}", e.getMessage(), e);
            ExcelDownloadResponse errorResponse = ExcelDownloadResponse.builder()
                    .message("Failed to generate Excel file: " + e.getMessage())
                    .build();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(errorResponse);
        }
    }

    @GetMapping("/downloadExcel/{fileId}")
    public ResponseEntity<byte[]> downloadExcel(@PathVariable String fileId) {
        try {
            log.info("Download request for file ID: {}", fileId);
            
            byte[] fileContent = fileStorageService.retrieveFile(fileId);
            if (fileContent == null) {
                log.warn("File not found or expired: {}", fileId);
                return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
            }
            
            String fileName = fileStorageService.getFileName(fileId);
            if (fileName == null) {
                fileName = "salesforce_data.xlsx";
            }
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_OCTET_STREAM);
            headers.setContentDispositionFormData("attachment", fileName);
            headers.setContentLength(fileContent.length);
            
            log.info("File downloaded successfully. ID: {}, Size: {} bytes", fileId, fileContent.length);
            
            // Optionally remove file after download (uncomment if you want one-time download)
            // fileStorageService.removeFile(fileId);
            
            return ResponseEntity.ok()
                    .headers(headers)
                    .body(fileContent);
        } catch (Exception e) {
            log.error("Error downloading file: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().build();
        }
    }

}
