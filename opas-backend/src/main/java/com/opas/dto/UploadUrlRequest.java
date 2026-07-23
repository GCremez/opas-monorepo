package com.opas.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record UploadUrlRequest(
        // Bounded and free of path separators / control chars — the filename is used
        // to build the S3 object key, so reject anything that could manipulate the path.
        @NotBlank @Size(max = 255) @Pattern(regexp = "^[^/\\\\\\x00-\\x1f]+$",
                message = "filename contains invalid characters") String filename,
        // Only the document types the pipeline actually reads.
        @NotBlank @Pattern(regexp = "application/pdf|image/jpeg|image/png|image/heic|text/plain",
                message = "unsupported content type") String contentType) {
}
