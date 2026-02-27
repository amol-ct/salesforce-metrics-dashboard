package com.performance.metrics.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class ResourceLink {

    // e.g. "athena://e7784bbb-024a-45c9-a025-db0b25c141bb"
    @JsonProperty("uri")
    private String uri;

    // e.g. "query_results_e7784bbb.csv"
    @JsonProperty("name")
    private String name;

    @JsonProperty("description")
    private String description;

    // default: "text/csv"
    @JsonProperty("mimeType")
    private String mimeType;
}
