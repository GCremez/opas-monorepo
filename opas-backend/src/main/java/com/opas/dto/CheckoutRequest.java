package com.opas.dto;

import jakarta.validation.constraints.NotBlank;

public record CheckoutRequest(@NotBlank String priceId) {
}