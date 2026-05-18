package com.opas.dto;

import java.util.UUID;

public record DocumentSearchResult(UUID id, String filename, double similarity) {
}
