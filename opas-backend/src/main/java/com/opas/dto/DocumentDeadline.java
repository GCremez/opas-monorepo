package com.opas.dto;

/** A date stated in a decoded document. {@code date} is an ISO calendar date (YYYY-MM-DD). */
public record DocumentDeadline(String date, String description) {
}
