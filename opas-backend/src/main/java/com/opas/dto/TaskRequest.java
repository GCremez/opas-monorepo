package com.opas.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Mark one of a document's deadlines or actions done, or not done again. */
public record TaskRequest(@NotBlank @Size(max = 512) String key, boolean done) {
}
