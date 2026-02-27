package com.performance.metrics.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ExcelDownloadResponse {
    private String downloadUrl;
    private String fileName;
    private long fileSizeBytes;
    private String expiresIn;
    private String message;
}
