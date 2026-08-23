package com.opas.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Language is the optional device locale (en/fi/sv) sent by the app so the
 * verification email arrives in the user's language. Defaults to English.
 */
public record RegisterRequest(@NotBlank @Email String email, @NotBlank @Size(min = 8, max = 128) String password,
        @NotBlank String name, String language) {
}