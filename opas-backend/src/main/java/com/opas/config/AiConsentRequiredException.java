package com.opas.config;

/**
 * Thrown when a user asks for a decode or a draft before agreeing that their letters are
 * sent to the AI provider. Mapped to 403 with its own code so the client can show the
 * consent screen instead of a generic error.
 */
public class AiConsentRequiredException extends RuntimeException {
    public AiConsentRequiredException() {
        super("Agree to AI processing before reading a letter");
    }
}
