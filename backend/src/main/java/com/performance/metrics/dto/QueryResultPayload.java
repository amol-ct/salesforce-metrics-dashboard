package com.performance.metrics.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

import java.util.List;
import java.util.Map;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class QueryResultPayload {

    @JsonProperty("query_execution_id")
    private String queryExecutionId;

    @JsonProperty("columns")
    private List<String> columns;

    // Each row is a map of column name → value
    @JsonProperty("rows")
    private List<Map<String, Object>> rows;

    @JsonProperty("bytes_scanned")
    private Long bytesScanned;

    @JsonProperty("execution_time_ms")
    private Long executionTimeMs;

    // true if result is a preview (large result set)
    @JsonProperty("truncated")
    private Boolean truncated;

    @JsonProperty("is_preview")
    private Boolean isPreview;

    @JsonProperty("is_complete")
    private Boolean isComplete;

    // null when total row count is unknown
    @JsonProperty("total_rows")
    private Long totalRows;

    @JsonProperty("total_rows_known")
    private Boolean totalRowsKnown;

    @JsonProperty("message")
    private String message;
}
