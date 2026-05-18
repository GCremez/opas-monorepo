package com.opas.dto;

import java.time.Instant;
import java.util.UUID;

public record DecodeRequest(
        boolean scrubPii
) {}
