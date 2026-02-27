package com.performance.metrics.services.impl;

import com.performance.metrics.services.S3Service;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.AwsCredentialsProvider;
import software.amazon.awssdk.auth.credentials.AwsSessionCredentials;
import software.amazon.awssdk.auth.credentials.DefaultCredentialsProvider;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.core.ResponseInputStream;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectResponse;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;
import software.amazon.awssdk.services.s3.presigner.model.PresignedGetObjectRequest;

import java.io.InputStream;
import java.time.Duration;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

@Slf4j
@Service
public class S3ServiceImpl implements S3Service {

    @Value("${aws.s3.bucket.name:aws-athena-query-results-219341907983-ap-south-1}")
    private String bucketName;

    @Value("${aws.region:ap-south-1}")
    private String awsRegion;

    private final S3Client s3Client;
    private final AwsCredentialsProvider credentialsProvider;

    public S3ServiceImpl(
            @Value("${aws.region:ap-south-1}") String awsRegion,
            @Value("${aws.access.key.id:}") String accessKeyId,
            @Value("${aws.secret.access.key:}") String secretAccessKey,
            @Value("${aws.session.token:}") String sessionToken) {
        
        // Use provided credentials if available, otherwise use default credentials chain
        if (accessKeyId != null && !accessKeyId.isEmpty() &&
            secretAccessKey != null && !secretAccessKey.isEmpty()) {
            
            // Check if session token is provided (for temporary credentials)
            if (sessionToken != null && !sessionToken.isEmpty()) {
                log.info("Using provided AWS temporary credentials with session token");
                this.credentialsProvider = StaticCredentialsProvider.create(
                        AwsSessionCredentials.create(accessKeyId, secretAccessKey, sessionToken)
                );
            } else {
                log.info("Using provided AWS permanent credentials");
                this.credentialsProvider = StaticCredentialsProvider.create(
                        AwsBasicCredentials.create(accessKeyId, secretAccessKey)
                );
            }
        } else {
            log.info("Using default AWS credentials chain");
            this.credentialsProvider = DefaultCredentialsProvider.create();
        }
        
        this.s3Client = S3Client.builder()
                .region(Region.of(awsRegion))
                .credentialsProvider(this.credentialsProvider)
                .build();
    }

    @Override
    public InputStream downloadCsvFromS3(String queryExecutionId) {
        try {
            String key = queryExecutionId + ".csv";
            log.info("Downloading CSV from S3 bucket: {}, key: {}", bucketName, key);

            GetObjectRequest getObjectRequest = GetObjectRequest.builder()
                    .bucket(bucketName)
                    .key(key)
                    .build();

            ResponseInputStream<GetObjectResponse> s3Object = s3Client.getObject(getObjectRequest);
            log.info("Successfully downloaded CSV from S3");
            return s3Object;
        } catch (Exception e) {
            log.error("Error downloading CSV from S3: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to download CSV from S3", e);
        }
    }

    @Override
    public String uploadExcelToS3(String fileName, byte[] fileContent) {
        try {
            // Generate a unique key with timestamp
            String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss"));
            String s3Key = "excel-exports/" + timestamp + "_" + fileName;
            
            log.info("Uploading Excel file to S3 bucket: {}, key: {}", bucketName, s3Key);

            PutObjectRequest putObjectRequest = PutObjectRequest.builder()
                    .bucket(bucketName)
                    .key(s3Key)
                    .contentType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
                    .build();

            s3Client.putObject(putObjectRequest, RequestBody.fromBytes(fileContent));
            log.info("Successfully uploaded Excel file to S3. Size: {} bytes", fileContent.length);
            
            return s3Key;
        } catch (Exception e) {
            log.error("Error uploading Excel file to S3: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to upload Excel file to S3", e);
        }
    }

    @Override
    public String generatePresignedUrl(String s3Key, int expirationMinutes) {
        try {
            log.info("Generating presigned URL for S3 key: {}, expiration: {} minutes", s3Key, expirationMinutes);

            // Create S3Presigner with the same credentials and region
            S3Presigner presigner = S3Presigner.builder()
                    .region(Region.of(awsRegion))
                    .credentialsProvider(this.credentialsProvider)
                    .build();

            GetObjectRequest getObjectRequest = GetObjectRequest.builder()
                    .bucket(bucketName)
                    .key(s3Key)
                    .build();

            GetObjectPresignRequest presignRequest = GetObjectPresignRequest.builder()
                    .signatureDuration(Duration.ofMinutes(expirationMinutes))
                    .getObjectRequest(getObjectRequest)
                    .build();

            PresignedGetObjectRequest presignedRequest = presigner.presignGetObject(presignRequest);
            String url = presignedRequest.url().toString();
            
            log.info("Successfully generated presigned URL");
            presigner.close();
            
            return url;
        } catch (Exception e) {
            log.error("Error generating presigned URL: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to generate presigned URL", e);
        }
    }
}
