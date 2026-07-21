package com.opas.dto;

import java.util.UUID;

public record DecodeMessage(UUID userId, UUID documentId, boolean scrubPii) {
}
