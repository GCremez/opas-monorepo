package com.opas.dto;

import jakarta.validation.constraints.NotBlank;

public record DraftLetterRequest(
    @NotBlank String tone,
    boolean includeOriginal
) {}
