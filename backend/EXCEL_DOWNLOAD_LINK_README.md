# Excel Download Link Feature

## Overview
This feature allows you to generate Excel files from SalesForce data and receive a download link from the application server instead of downloading the file directly. The Excel files are stored temporarily in-memory and automatically cleaned up after expiration.

## Benefits
- Asynchronous processing - get the link immediately
- Sharing download links with others
- Reduced response payload size
- Better handling of large files
- No S3 upload required - files stored temporarily in application memory

## New Endpoint

### POST `/public/metrics/getSalesForceDataAsExcel`

Returns a JSON response with a download link for the generated Excel file.

#### Request Headers
- `x-workspace-id`: Your workspace identifier

#### Request Body
```json
{
  "case_record_type__c": ["Type1", "Type2"],
  "customer_segment__c": ["Segment1", "Segment2"],
  "type": ["Feature"]
}
```

#### Response
```json
{
  "downloadUrl": "/public/metrics/downloadExcel/550e8400-e29b-41d4-a716-446655440000",
  "fileName": "salesforce_data.xlsx",
  "fileSizeBytes": 12345,
  "expiresIn": "60 minutes",
  "message": "Excel file generated successfully. Download link will expire in 60 minutes."
}
```

#### Response Fields
- `downloadUrl`: Relative URL to download the Excel file from the application server
- `fileName`: Name of the generated Excel file
- `fileSizeBytes`: Size of the file in bytes
- `expiresIn`: Expiration time for the download link
- `message`: Success message with expiration information

## Download Endpoint

### GET `/public/metrics/downloadExcel/{fileId}`

Downloads the Excel file using the file ID from the download link.

#### Path Parameters
- `fileId`: The unique file identifier from the downloadUrl

#### Response
- Binary Excel file with appropriate headers for download
- HTTP 404 if file not found or expired

## Configuration

### Application Properties

Add the following configuration to `application.properties`:

```properties
# Temporary file storage configuration
temp.file.expiration.minutes=60
temp.file.cleanup.interval.ms=300000
```

**Configuration Options:**
- `temp.file.expiration.minutes`: How long files are kept in memory (default: 60 minutes)
- `temp.file.cleanup.interval.ms`: How often to run cleanup task (default: 300000ms = 5 minutes)

## Implementation Details

### Components

1. **ExcelDownloadResponse DTO** ([`ExcelDownloadResponse.java`](src/main/java/com/performance/metrics/dto/ExcelDownloadResponse.java:1))
   - Contains download URL and metadata

2. **TemporaryFileStorageService** ([`TemporaryFileStorageService.java`](src/main/java/com/performance/metrics/services/TemporaryFileStorageService.java:1))
   - Interface for temporary file storage operations

3. **TemporaryFileStorageServiceImpl** ([`TemporaryFileStorageServiceImpl.java`](src/main/java/com/performance/metrics/services/impl/TemporaryFileStorageServiceImpl.java:1))
   - In-memory storage using ConcurrentHashMap
   - Automatic cleanup of expired files via scheduled task
   - Thread-safe operations

4. **MetricsService** ([`MetricsServiceImpl.java`](src/main/java/com/performance/metrics/services/impl/MetricsServiceImpl.java:1))
   - [`getSalesForceDataAsExcelWithDownloadLink()`](src/main/java/com/performance/metrics/services/impl/MetricsServiceImpl.java:152): Generates Excel and stores temporarily

5. **MetricsController** ([`MetricsController.java`](src/main/java/com/performance/metrics/controllers/MetricsController.java:1))
   - POST [`/getSalesForceDataAsExcel`](src/main/java/com/performance/metrics/controllers/MetricsController.java:56): Returns download link
   - GET [`/downloadExcel/{fileId}`](src/main/java/com/performance/metrics/controllers/MetricsController.java:79): Downloads the file

### File Storage

Excel files are stored in-memory with:
- Unique UUID-based file IDs
- Expiration timestamps
- Automatic cleanup via scheduled task (runs every 5 minutes by default)

## Usage Example

### Step 1: Generate Excel and Get Download Link

```bash
curl -X POST http://localhost:8080/public/metrics/getSalesForceDataAsExcel \
  -H "Content-Type: application/json" \
  -H "x-workspace-id: your-workspace-id" \
  -d '{
    "case_record_type__c": ["Support"],
    "customer_segment__c": ["Enterprise"],
    "type": ["Feature"]
  }'
```

### Response Example

```json
{
  "downloadUrl": "/public/metrics/downloadExcel/550e8400-e29b-41d4-a716-446655440000",
  "fileName": "salesforce_data.xlsx",
  "fileSizeBytes": 45678,
  "expiresIn": "60 minutes",
  "message": "Excel file generated successfully. Download link will expire in 60 minutes."
}
```

### Step 2: Download the File

```bash
curl -o salesforce_data.xlsx \
  "http://localhost:8080/public/metrics/downloadExcel/550e8400-e29b-41d4-a716-446655440000"
```

Or simply open the URL in a browser to download the file.

## Workflow

1. Client calls `/getSalesForceDataAsExcel` with query filters
2. Server generates Excel file from SalesForce data
3. Server stores Excel file temporarily in memory with unique ID
4. Server returns JSON response with download URL
5. Client uses download URL to retrieve the file (can be shared with others)
6. File automatically expires and is cleaned up after configured time

## Security

- Files are stored in application memory (not persisted to disk)
- Each file has a unique UUID that's hard to guess
- Files automatically expire after configured time
- Expired files are automatically cleaned up
- No authentication required for download (use workspace-id in generation endpoint)

## Error Handling

### Generation Endpoint Errors

If an error occurs during Excel generation, the endpoint returns:
```json
{
  "message": "Failed to generate Excel file: [error details]"
}
```
HTTP Status: 500 Internal Server Error

### Download Endpoint Errors

- **File Not Found or Expired**: HTTP 404 Not Found
- **Server Error**: HTTP 500 Internal Server Error

## Notes

- Files are stored in application memory, so they will be lost on application restart
- Consider memory usage when setting expiration time and file size limits
- The cleanup task runs periodically to remove expired files
- For production use, consider implementing:
  - File size limits
  - Rate limiting
  - User-specific file quotas
  - Persistent storage for longer retention
- Files can be downloaded multiple times before expiration (uncomment removal line in controller for one-time download)

## Comparison with Direct Download

### Original Approach (if you had direct download):
- Returns Excel file directly as binary data
- Synchronous download
- Client must wait for entire file generation and transfer
- Larger response payload

### New Approach (Download Link):
- Returns JSON with download link
- Asynchronous download capability
- Client receives link immediately
- Link can be shared with others
- Smaller initial response
- Better for large files and distributed systems
