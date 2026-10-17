package com.opas.dto;

import com.opas.domain.Folder;
import java.time.Instant;
import java.util.UUID;
import org.springframework.lang.Nullable;

public record FolderResponse(
        UUID id,
        String name,
        @Nullable String description,
        // Built-in category key (e.g. "kela"), or null for a folder the user created.
        @Nullable String categoryKey,
        long documentCount,
        Instant createdAt,
        Instant updatedAt
) {
    public static FolderResponse from(Folder folder, long documentCount) {
        return new FolderResponse(
                folder.getId(),
                folder.getName(),
                folder.getDescription(),
                folder.getCategoryKey(),
                documentCount,
                folder.getCreatedAt(),
                folder.getUpdatedAt()
        );
    }
}
