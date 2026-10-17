package com.opas.dto;

import java.time.Instant;

public record CompletedTaskResponse(String key, Instant completedAt) {
}
