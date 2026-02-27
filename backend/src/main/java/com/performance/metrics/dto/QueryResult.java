package com.performance.metrics.dto;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonSubTypes;
import com.fasterxml.jackson.annotation.JsonTypeInfo;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.util.List;

@JsonTypeInfo(
        use = JsonTypeInfo.Id.NAME,
        include = JsonTypeInfo.As.EXISTING_PROPERTY,
        property = "type",
        visible = true
)
@JsonSubTypes({
        @JsonSubTypes.Type(value = QueryResult.InlineQueryResult.class,   name = "inline"),
        @JsonSubTypes.Type(value = QueryResult.ResourceQueryResult.class, name = "resource"),
        @JsonSubTypes.Type(value = QueryResult.PendingQueryResult.class,  name = "pending")
})
public abstract class QueryResult {

    @JsonProperty("type")
    private String type;

    @JsonProperty("content")
    private List<ContentItem> content;

    // Small results (≤100 rows) — full data returned inline
    @Data
    @EqualsAndHashCode(callSuper = true)
    public static class InlineQueryResult extends QueryResult { }

    // Large results (>100 rows) — preview + resource link
    @Data
    @EqualsAndHashCode(callSuper = true)
    public static class ResourceQueryResult extends QueryResult { }

    // Query timed out, still running — poll with get_query_status
    @Data
    @EqualsAndHashCode(callSuper = true)
    public static class PendingQueryResult extends QueryResult { }
}
