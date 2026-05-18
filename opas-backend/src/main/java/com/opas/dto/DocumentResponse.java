package com.opas.dto;

import java.time.Instant;
import java.util.UUID;

public record DocumentResponse(
        UUID id,
        String filename,
        String contentType,
        Long fileSize,
        String status,
        Instant createdAt,
        Instant updatedAt,
        String uploadUrl,
        String downloadUrl
) {}
