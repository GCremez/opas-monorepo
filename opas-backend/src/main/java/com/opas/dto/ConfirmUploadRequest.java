package com.opas.dto;

import jakarta.validation.constraints.Pattern;

public record ConfirmUploadRequest(
        // Optional: if provided, the server verifies the uploaded object's content type
        // matches what was declared at upload-url time. Prevents a client from uploading
        // a PDF but claiming it's a JPEG, which would dispatch the wrong OCR path.
        @Pattern(regexp = "application/pdf|image/jpeg|image/png|image/heic|text/plain",
                message = "unsupported content type") String contentType) {
}
