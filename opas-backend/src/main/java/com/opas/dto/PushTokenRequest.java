package com.opas.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record PushTokenRequest(
    @NotBlank @Size(max = 255) String token,
    @NotBlank @Pattern(regexp = "ios|android|web", message = "unsupported platform") String platform
) {}
