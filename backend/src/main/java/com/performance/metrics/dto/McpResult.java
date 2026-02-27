package com.performance.metrics.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

import java.util.List;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class McpResult {

    @JsonProperty("content")
    private List<TextContent> content;

    @JsonProperty("structuredContent")
    private StructuredContent structuredContent;

    @JsonProperty("isError")
    private Boolean isError;

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class TextContent {
        @JsonProperty("type")
        private String type;

        @JsonProperty("text")
        private String text;
    }
}
