package com.opas.service;

/**
 * Raised when PII detection/anonymization cannot be completed. Callers that were
 * asked to scrub PII must treat this as fatal (fail closed) rather than proceeding
 * with un-scrubbed text — otherwise raw personal data would reach downstream
 * processors (e.g. the third-party LLM).
 */
public class PresidioUnavailableException extends RuntimeException {
    public PresidioUnavailableException(String message, Throwable cause) {
        super(message, cause);
    }
}
