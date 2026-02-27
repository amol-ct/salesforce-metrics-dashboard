package com.performance.metrics.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

import java.util.List;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class StructuredContent {

    @JsonProperty("result")
    private ResultContent result;

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class ResultContent {
        @JsonProperty("type")
        private String type;

        @JsonProperty("content")
        private List<ContentItem> content;
    }
}
