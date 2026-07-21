package com.opas.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.lang.Nullable;

public record FolderRequest(
        @NotBlank @Size(max = 255) String name,
        @Nullable @Size(max = 2000) String description
) {}
