package com.performance.metrics.services.impl;

import com.performance.metrics.services.TemporaryFileStorageService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Service
public class TemporaryFileStorageServiceImpl implements TemporaryFileStorageService {

    @Value("${temp.file.expiration.minutes:60}")
    private int expirationMinutes;

    private final Map<String, FileEntry> fileStorage = new ConcurrentHashMap<>();

    @Override
    public String storeFile(String fileName, ByteArrayOutputStream fileContent) {
        String fileId = UUID.randomUUID().toString();
        byte[] bytes = fileContent.toByteArray();
        long expirationTime = Instant.now().plusSeconds(expirationMinutes * 60L).toEpochMilli();
        
        FileEntry entry = new FileEntry(fileName, bytes, expirationTime);
        fileStorage.put(fileId, entry);
        
        log.info("Stored file temporarily. ID: {}, Name: {}, Size: {} bytes, Expires in: {} minutes", 
                fileId, fileName, bytes.length, expirationMinutes);
        
        return fileId;
    }

    @Override
    public byte[] retrieveFile(String fileId) {
        FileEntry entry = fileStorage.get(fileId);
        if (entry == null) {
            log.warn("File not found: {}", fileId);
            return null;
        }
        
        if (entry.isExpired()) {
            log.warn("File expired: {}", fileId);
            fileStorage.remove(fileId);
            return null;
        }
        
        log.info("Retrieved file: {}, Size: {} bytes", fileId, entry.content.length);
        return entry.content;
    }

    @Override
    public String getFileName(String fileId) {
        FileEntry entry = fileStorage.get(fileId);
        return entry != null ? entry.fileName : null;
    }

    @Override
    public void removeFile(String fileId) {
        FileEntry removed = fileStorage.remove(fileId);
        if (removed != null) {
            log.info("Removed file: {}", fileId);
        }
    }

    @Override
    @Scheduled(fixedDelayString = "${temp.file.cleanup.interval.ms:300000}") // Default: 5 minutes
    public void cleanupExpiredFiles() {
        long now = Instant.now().toEpochMilli();
        int removedCount = 0;
        
        for (Map.Entry<String, FileEntry> entry : fileStorage.entrySet()) {
            if (entry.getValue().expirationTime < now) {
                fileStorage.remove(entry.getKey());
                removedCount++;
            }
        }
        
        if (removedCount > 0) {
            log.info("Cleaned up {} expired files. Remaining files: {}", removedCount, fileStorage.size());
        }
    }

    private static class FileEntry {
        final String fileName;
        final byte[] content;
        final long expirationTime;

        FileEntry(String fileName, byte[] content, long expirationTime) {
            this.fileName = fileName;
            this.content = content;
            this.expirationTime = expirationTime;
        }

        boolean isExpired() {
            return Instant.now().toEpochMilli() > expirationTime;
        }
    }
}
