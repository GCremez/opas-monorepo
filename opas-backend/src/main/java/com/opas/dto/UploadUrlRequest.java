package com.opas.dto;

import jakarta.validation.constraints.NotBlank;

public record UploadUrlRequest(@NotBlank String filename, @NotBlank String contentType) {
}
