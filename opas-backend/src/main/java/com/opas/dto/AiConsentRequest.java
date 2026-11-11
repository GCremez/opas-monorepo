package com.opas.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** The version of the AI consent screen the person just agreed to, e.g. "v2". */
public record AiConsentRequest(
        @NotBlank @Size(max = 32) @Pattern(regexp = "[A-Za-z0-9._-]+") String version) {
}
