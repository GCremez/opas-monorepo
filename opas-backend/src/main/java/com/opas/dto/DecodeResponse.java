package com.opas.dto;

import java.time.Instant;
import java.util.UUID;

public record DecodeResponse(
        UUID id,
        UUID documentId,
        String rawResponse,
        String structuredData,
        boolean piiScrubbed,
        String model,
        int tokensIn,
        int tokensOut,
        long durationMs,
        Instant createdAt
) {}
