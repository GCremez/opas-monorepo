package com.opas.dto;

import java.util.UUID;
import org.springframework.lang.Nullable;

public record DocumentSearchResult(UUID id, @Nullable String filename, double similarity) {
}
