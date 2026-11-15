package com.opas.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record DraftLetterRequest(
    // Only the tones the app offers: the tone is written into the AI prompt.
    @NotBlank @Pattern(regexp = "formal|professional", message = "unsupported tone") String tone,
    boolean includeOriginal
) {}
