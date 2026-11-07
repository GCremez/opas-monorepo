package com.opas.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record DraftLetterRequest(
    // Goes into the prompt, so only the tones the app offers.
    @NotBlank @Pattern(regexp = "formal|professional", message = "unsupported tone") String tone,
    boolean includeOriginal
) {}
