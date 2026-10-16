package com.opas.config;

/**
 * Thrown when a user has used their monthly decode allowance. Mapped to 402 Payment
 * Required so the client can tell "you've hit your plan limit" apart from an ordinary
 * 400 validation error and show the upgrade path.
 */
public class QuotaExceededException extends RuntimeException {

    public QuotaExceededException(String message) {
        super(message);
    }
}
