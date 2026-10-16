package com.opas.service;

/**
 * Claude declined the request (stop_reason "refusal"), after any configured fallback.
 * Not retryable: sending the same document again gets the same answer.
 */
public class ClaudeRefusalException extends RuntimeException {
    public ClaudeRefusalException(String message) {
        super(message);
    }
}
