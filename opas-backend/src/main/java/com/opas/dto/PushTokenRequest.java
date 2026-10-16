package com.opas.dto;

import jakarta.validation.constraints.NotBlank;

public record PushTokenRequest(
    @NotBlank String token,
    @NotBlank String platform
) {}
