package com.opas.config;

/**
 * Thrown when a user asks for a decode or a draft before agreeing that their letters are
 * sent to the AI provider. Mapped to 403 with its own code so the client can show the
 * consent screen instead of a generic error.
 */
public class AiConsentRequiredException extends RuntimeException {

    /**
     * The consent wording now in the app (a date). Bump it together with the app's
     * AI_CONSENT_VERSION whenever the wording changes in substance, and everyone who agreed
     * to an older one is asked again before their next letter is read.
     */
    public static final String CURRENT_VERSION = "2026-11-08";

    public AiConsentRequiredException() {
        super("Agree to AI processing before reading a letter");
    }
}
