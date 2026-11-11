package com.opas.config;

/**
 * Thrown when someone who withdrew their AI consent asks for a letter to be read or a
 * reply drafted. Mapped to 403 with code {@code ai_consent_required} so the app can show
 * the consent screen again instead of a generic error.
 */
public class AiConsentRequiredException extends RuntimeException {
    public AiConsentRequiredException() {
        super("AI consent was withdrawn; agree again to have letters read");
    }
}
