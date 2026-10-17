package com.opas.dto;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.lang.Nullable;

public record DocumentResponse(UUID id, String filename, String contentType, Long fileSize, String status,
        @Nullable UUID folderId, Instant createdAt, Instant updatedAt, @Nullable String uploadUrl,
        @Nullable String downloadUrl,
        // From the latest decode; null/empty until the document has been analyzed.
        @Nullable String title, @Nullable String authority, List<DocumentDeadline> deadlines,
        // The letter's own title in its original language, the plain-language summary and the
        // actions: what search matches against on the phone.
        @Nullable String documentType, @Nullable String summary, List<String> actions,
        // The headline figure for lists, e.g. "€387.20/mo".
        @Nullable String keyFigure,
        // Deadlines and actions the user has marked done.
        List<CompletedTaskResponse> completedTasks) {
}
