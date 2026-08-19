package com.opas.dto;

import java.util.UUID;
import org.springframework.lang.Nullable;

/**
 * Request to file a document under a folder. A null folderId unfiles the document
 * (removes it from any folder).
 */
public record AssignFolderRequest(@Nullable UUID folderId) {
}
