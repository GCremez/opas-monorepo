package com.opas.dto;

import static org.junit.jupiter.api.Assertions.*;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class DecodeResponseTest {

    private final ObjectMapper mapper = new ObjectMapper().registerModule(new JavaTimeModule());

    @Test
    void structuredDataIsSerializedAsJsonObjectNotString() throws Exception {
        var response = new DecodeResponse(UUID.randomUUID(), UUID.randomUUID(), "Here is the analysis",
                "{\"documentType\":\"decision\",\"language\":\"fi\"}", true, "model", 1, 2, 3L, Instant.now());

        JsonNode json = mapper.readTree(mapper.writeValueAsString(response));

        assertTrue(json.get("structuredData").isObject());
        assertEquals("decision", json.get("structuredData").get("documentType").asText());
        assertEquals("Here is the analysis", json.get("rawResponse").asText());
    }

    @Test
    void nullStructuredDataIsSerializedAsNull() throws Exception {
        var response = new DecodeResponse(UUID.randomUUID(), UUID.randomUUID(), "text", null, false, "model", 0, 0,
                0L, Instant.now());

        JsonNode json = mapper.readTree(mapper.writeValueAsString(response));

        assertTrue(json.get("structuredData").isNull());
    }
}
