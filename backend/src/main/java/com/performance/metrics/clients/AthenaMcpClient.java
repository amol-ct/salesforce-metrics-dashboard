package com.performance.metrics.clients;

import com.performance.metrics.dto.McpRequest;
import com.performance.metrics.dto.RunQueryRequest;
import com.performance.metrics.dto.RunQueryResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.converter.json.Jackson2ObjectMapperBuilder;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

@Component
public class AthenaMcpClient {

    private static final Logger log = LoggerFactory.getLogger(AthenaMcpClient.class);

    private final RestClient restClient;
    private final com.fasterxml.jackson.databind.ObjectMapper objectMapper;

    public AthenaMcpClient(
            @Value("${athena.mcp.base-url}") String baseUrl,
            @Value("${athena.mcp.api-token}") String apiToken) {
        this.objectMapper = Jackson2ObjectMapperBuilder.json().build();
        this.restClient = RestClient.builder()
                .baseUrl(baseUrl)
                .defaultHeader("Content-Type", "application/json")
                .defaultHeader("Accept", "application/json, text/event-stream")
                .defaultHeader("Authorization", apiToken)
                .defaultHeader("x-api-token", apiToken)
                .build();
    }

    public RunQueryResponse runQuery(RunQueryRequest request) {
        McpRequest mcpRequest = McpRequest.builder()
                .params(McpRequest.McpParams.builder()
                        .arguments(request)
                        .build())
                .build();

        String responseBody = restClient.post()
                .contentType(MediaType.APPLICATION_JSON)
                .body(mcpRequest)
                .retrieve()
                .body(String.class);

        log.info("Raw response from Athena MCP: {}", responseBody);
        return parseEventStreamResponse(responseBody);
    }

    private RunQueryResponse parseEventStreamResponse(String responseBody) {
        try {
            String jsonToParse = responseBody;

            // Handle SSE format: extract JSON from "data:" lines
            if (responseBody != null && responseBody.contains("data:")) {
                StringBuilder jsonBuilder = new StringBuilder();
                for (String line : responseBody.split("\n")) {
                    String trimmedLine = line.trim();
                    if (trimmedLine.startsWith("data:")) {
                        String data = trimmedLine.substring(5).trim();
                        // Skip SSE control messages
                        if (!data.isEmpty() && !data.equals("[DONE]")) {
                            jsonBuilder.append(data);
                        }
                    }
                }
                String extractedJson = jsonBuilder.toString();
                if (!extractedJson.isEmpty()) {
                    jsonToParse = extractedJson;
                }
            }

            log.info("JSON to parse: {}", jsonToParse);
            RunQueryResponse response = objectMapper.readValue(jsonToParse, RunQueryResponse.class);
            log.info("Parsed response - structuredContent is null: {}", response.getResult() == null || response.getResult().getStructuredContent() == null);
            return response;
        } catch (Exception e) {
            log.error("Failed to parse response: {}", responseBody, e);
            throw new RuntimeException("Failed to parse Athena MCP response", e);
        }
    }
}
