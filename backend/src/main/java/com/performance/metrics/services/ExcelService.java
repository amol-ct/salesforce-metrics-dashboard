package com.performance.metrics.services;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;

public interface ExcelService {
    
    /**
     * Convert CSV InputStream to Excel ByteArrayOutputStream
     * @param csvInputStream The CSV input stream
     * @return ByteArrayOutputStream containing Excel file
     */
    ByteArrayOutputStream convertCsvToExcel(InputStream csvInputStream);
}
