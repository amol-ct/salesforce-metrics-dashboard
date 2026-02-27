package com.performance.metrics.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class McpRequest {

    @JsonProperty("jsonrpc")
    @Builder.Default
    private String jsonrpc = "2.0";

    @JsonProperty("id")
    @Builder.Default
    private Integer id = 1;

    @JsonProperty("method")
    @Builder.Default
    private String method = "tools/call";

    @JsonProperty("params")
    private McpParams params;

    @Data
    @Builder
    public static class McpParams {
        @JsonProperty("name")
        @Builder.Default
        private String name = "run_query";

        @JsonProperty("arguments")
        private RunQueryRequest arguments;
    }
}
