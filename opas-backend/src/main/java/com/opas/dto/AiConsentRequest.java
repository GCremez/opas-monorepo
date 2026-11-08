package com.opas.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

/** The version (a date) of the consent wording the user saw and agreed to. */
public record AiConsentRequest(
        @NotBlank @Pattern(regexp = "\\d{4}-\\d{2}-\\d{2}", message = "version must be a date") String version) {
}
