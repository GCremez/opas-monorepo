package com.opas.dto;

import java.time.Instant;
import java.util.UUID;

public record DraftLetterResponse(
    UUID id,
    UUID documentId,
    String content,
    String tone,
    Instant createdAt
) {}
