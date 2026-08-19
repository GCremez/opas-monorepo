package com.opas.dto;

import java.time.Instant;
import java.util.UUID;
import org.springframework.lang.Nullable;

public record DocumentResponse(UUID id, String filename, String contentType, Long fileSize, String status,
        @Nullable UUID folderId, Instant createdAt, Instant updatedAt, @Nullable String uploadUrl,
        @Nullable String downloadUrl) {
}
