package com.performance.metrics.services;

import java.io.InputStream;

public interface S3Service {
    
    /**
     * Download a file from S3 bucket
     * @param queryExecutionId The Athena query execution ID
     * @return InputStream of the CSV file
     */
    InputStream downloadCsvFromS3(String queryExecutionId);
    
    /**
     * Upload Excel file to S3 bucket
     * @param fileName The name of the file to upload
     * @param fileContent The file content as byte array
     * @return The S3 key of the uploaded file
     */
    String uploadExcelToS3(String fileName, byte[] fileContent);
    
    /**
     * Generate a presigned URL for downloading a file from S3
     * @param s3Key The S3 key of the file
     * @param expirationMinutes The expiration time in minutes
     * @return The presigned URL
     */
    String generatePresignedUrl(String s3Key, int expirationMinutes);
}
