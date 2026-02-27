package com.performance.metrics.services.impl;

import com.performance.metrics.services.ExcelService;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVParser;
import org.apache.commons.csv.CSVRecord;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.Reader;
import java.nio.charset.StandardCharsets;
import java.util.List;

@Slf4j
@Service
public class ExcelServiceImpl implements ExcelService {
    private static final int EXCEL_MAX_COLUMN_WIDTH = 255 * 256;
    private static final int EXTRA_COLUMN_PADDING = 1000;

    @Override
    public ByteArrayOutputStream convertCsvToExcel(InputStream csvInputStream) {
        ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
        
        try (Reader reader = new InputStreamReader(csvInputStream, StandardCharsets.UTF_8);
             CSVParser csvParser = new CSVParser(reader, CSVFormat.DEFAULT.withFirstRecordAsHeader());
             Workbook workbook = new XSSFWorkbook()) {

            Sheet sheet = workbook.createSheet("Query Results");
            
            // Create header style
            CellStyle headerStyle = workbook.createCellStyle();
            Font headerFont = workbook.createFont();
            headerFont.setBold(true);
            headerFont.setFontHeightInPoints((short) 12);
            headerStyle.setFont(headerFont);
            headerStyle.setFillForegroundColor(IndexedColors.GREY_25_PERCENT.getIndex());
            headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            headerStyle.setBorderBottom(BorderStyle.THIN);
            headerStyle.setBorderTop(BorderStyle.THIN);
            headerStyle.setBorderLeft(BorderStyle.THIN);
            headerStyle.setBorderRight(BorderStyle.THIN);

            // Create data cell style
            CellStyle dataStyle = workbook.createCellStyle();
            dataStyle.setBorderBottom(BorderStyle.THIN);
            dataStyle.setBorderTop(BorderStyle.THIN);
            dataStyle.setBorderLeft(BorderStyle.THIN);
            dataStyle.setBorderRight(BorderStyle.THIN);

            // Get headers
            List<String> headers = csvParser.getHeaderNames();
            
            // Create header row
            Row headerRow = sheet.createRow(0);
            for (int i = 0; i < headers.size(); i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers.get(i));
                cell.setCellStyle(headerStyle);
            }

            // Create data rows
            int rowNum = 1;
            for (CSVRecord csvRecord : csvParser) {
                Row row = sheet.createRow(rowNum++);
                for (int i = 0; i < headers.size(); i++) {
                    Cell cell = row.createCell(i);
                    String value = csvRecord.get(i);
                    cell.setCellValue(value != null ? value : "");
                    cell.setCellStyle(dataStyle);
                }
            }

            // Auto-size columns
            for (int i = 0; i < headers.size(); i++) {
                sheet.autoSizeColumn(i);
                // Add some extra width for better readability
                int currentWidth = sheet.getColumnWidth(i);
                int targetWidth = Math.min(currentWidth + EXTRA_COLUMN_PADDING, EXCEL_MAX_COLUMN_WIDTH);
                sheet.setColumnWidth(i, targetWidth);
            }

            workbook.write(outputStream);
            log.info("Successfully converted CSV to Excel. Total rows: {}", rowNum);
            
        } catch (Exception e) {
            log.error("Error converting CSV to Excel: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to convert CSV to Excel", e);
        }
        
        return outputStream;
    }
}
