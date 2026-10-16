package com.opas.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
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
                message = "unsupported content type") String contentType,
        // Declared file size in bytes. Server rejects uploads above the hard cap to
        // prevent storage abuse. The client must declare the size before receiving a
        // presigned URL so the server can enforce limits without relying on bucket
        // policies (which aren't available for all S3-compatible backends).
        @Min(value = 1, message = "file size must be positive")
        @Max(value = 20_971_520, message = "file size exceeds 20 MB limit") long fileSize) {
}
