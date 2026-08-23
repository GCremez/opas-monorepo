package com.opas.dto;

/**
 * Returned from registration. Registration no longer logs the user in: a hard email
 * verification gate applies, so the client must collect the verification code and call
 * {@code /auth/verify-email} before any tokens are issued.
 */
public record RegisterResponse(String email, boolean verificationRequired) {
    public static RegisterResponse verificationRequired(String email) {
        return new RegisterResponse(email, true);
    }
}
