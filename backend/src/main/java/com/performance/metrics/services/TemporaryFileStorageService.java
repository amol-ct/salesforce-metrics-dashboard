package com.performance.metrics.services;

import java.io.ByteArrayOutputStream;

public interface TemporaryFileStorageService {
    
    /**
     * Store a file temporarily and return a unique file ID
     * @param fileName The name of the file
     * @param fileContent The file content
     * @return Unique file ID for retrieval
     */
    String storeFile(String fileName, ByteArrayOutputStream fileContent);
    
    /**
     * Retrieve a file by its ID
     * @param fileId The unique file ID
     * @return The file content as byte array, or null if not found
     */
    byte[] retrieveFile(String fileId);
    
    /**
     * Get the file name for a given file ID
     * @param fileId The unique file ID
     * @return The file name, or null if not found
     */
    String getFileName(String fileId);
    
    /**
     * Remove a file from temporary storage
     * @param fileId The unique file ID
     */
    void removeFile(String fileId);
    
    /**
     * Clean up expired files
     */
    void cleanupExpiredFiles();
}
