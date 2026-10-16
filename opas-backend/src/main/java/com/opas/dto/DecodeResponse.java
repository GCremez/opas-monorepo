package com.opas.dto;

import com.fasterxml.jackson.annotation.JsonRawValue;
import java.time.Instant;
import java.util.UUID;
import org.springframework.lang.Nullable;

public record DecodeResponse(UUID id, UUID documentId, String rawResponse, @JsonRawValue @Nullable String structuredData,
        boolean piiScrubbed, String model, int tokensIn, int tokensOut, long durationMs, Instant createdAt) {
}
