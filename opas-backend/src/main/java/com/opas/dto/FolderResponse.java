package com.opas.dto;

import com.opas.domain.Folder;
import java.time.Instant;
import java.util.UUID;
import org.springframework.lang.Nullable;

public record FolderResponse(
        UUID id,
        String name,
        @Nullable String description,
        long documentCount,
        Instant createdAt,
        Instant updatedAt
) {
    public static FolderResponse from(Folder folder, long documentCount) {
        return new FolderResponse(
                folder.getId(),
                folder.getName(),
                folder.getDescription(),
                documentCount,
                folder.getCreatedAt(),
                folder.getUpdatedAt()
        );
    }
}
