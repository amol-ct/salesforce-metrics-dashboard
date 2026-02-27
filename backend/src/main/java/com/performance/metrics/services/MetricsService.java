package com.performance.metrics.services;


import com.performance.metrics.dto.ExcelDownloadResponse;
import com.performance.metrics.dto.RunQueryResponse;
import com.performance.metrics.dto.SalesForceQueryFilter;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;

@Service
public interface MetricsService {

    RunQueryResponse getSalesForceResponse(SalesForceQueryFilter filter);
    
    /**
     * Get SalesForce data as Excel file
     * @param filter The query filter
     * @return ByteArrayOutputStream containing Excel file
     */
    ByteArrayOutputStream getSalesForceDataAsExcel(SalesForceQueryFilter filter);
    
    /**
     * Get SalesForce data as Excel file and return download link
     * @param filter The query filter
     * @return ExcelDownloadResponse containing download URL and metadata
     */
    ExcelDownloadResponse getSalesForceDataAsExcelWithDownloadLink(SalesForceQueryFilter filter);
}
