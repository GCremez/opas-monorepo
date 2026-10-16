package com.opas.config;

/**
 * Thrown when a client asks for the result of a decode that failed. Mapped to 422 so the
 * client can stop polling and offer a retry, instead of polling a 404 until it times out.
 */
public class DecodeFailedException extends RuntimeException {
    public DecodeFailedException(String message) {
        super(message);
    }
}
