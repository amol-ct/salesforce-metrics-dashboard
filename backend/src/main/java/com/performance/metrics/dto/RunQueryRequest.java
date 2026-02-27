package com.performance.metrics.dto;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class RunQueryRequest {

    // Use fully-qualified table names e.g. "salesforce_crm_v2.account"
    @JsonProperty("query")
    private String query;

    // 1–10000, default 1000
    @JsonProperty("max_rows")
    @Builder.Default
    private Integer maxRows = 1000;
}
