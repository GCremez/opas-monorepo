package com.opas.config;

/**
 * Thrown when a user with valid credentials tries to log in before verifying their
 * email address. Mapped to 403 so the client can route the user to the verification
 * screen (and offer to resend the code) rather than showing a generic login error.
 */
public class EmailNotVerifiedException extends RuntimeException {
    public EmailNotVerifiedException(String message) {
        super(message);
    }
}
