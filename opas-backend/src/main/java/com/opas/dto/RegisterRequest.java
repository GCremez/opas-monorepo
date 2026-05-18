package com.opas.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RegisterRequest(@NotBlank @Email String email, @NotBlank @Size(min = 8, max = 128) String password,
        @NotBlank String name) {
}