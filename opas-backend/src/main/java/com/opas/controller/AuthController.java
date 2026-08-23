package com.opas.controller;

import com.opas.config.RateLimit;
import com.opas.dto.AuthResponse;
import com.opas.dto.ChangePasswordRequest;
import com.opas.dto.LoginRequest;
import com.opas.dto.RefreshRequest;
import com.opas.dto.RegisterRequest;
import com.opas.dto.RegisterResponse;
import com.opas.dto.ResendVerificationRequest;
import com.opas.dto.UserResponse;
import com.opas.dto.VerifyEmailRequest;
import com.opas.service.AuthService;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @RateLimit(key = "auth-register", limit = 5, windowSeconds = 3600)
    @PostMapping("/register")
    public ResponseEntity<RegisterResponse> register(@Valid @RequestBody RegisterRequest request) {
        // 202 Accepted: the account exists but is not yet usable — the client must verify
        // the emailed code before any tokens are issued.
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(authService.register(request));
    }

    @RateLimit(key = "auth-verify-email", limit = 10, windowSeconds = 300)
    @PostMapping("/verify-email")
    public ResponseEntity<AuthResponse> verifyEmail(@Valid @RequestBody VerifyEmailRequest request) {
        return ResponseEntity.ok(authService.verifyEmail(request.email(), request.code()));
    }

    @RateLimit(key = "auth-resend-verification", limit = 5, windowSeconds = 3600)
    @PostMapping("/resend-verification")
    public ResponseEntity<Void> resendVerification(@Valid @RequestBody ResendVerificationRequest request) {
        authService.resendVerification(request.email());
        // 204 regardless of whether the email exists — no account enumeration.
        return ResponseEntity.noContent().build();
    }

    @RateLimit(key = "auth-login", limit = 10, windowSeconds = 300)
    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }

    @RateLimit(key = "auth-refresh", limit = 30, windowSeconds = 300)
    @PostMapping("/refresh")
    public ResponseEntity<AuthResponse> refresh(@Valid @RequestBody RefreshRequest request) {
        return ResponseEntity.ok(authService.refresh(request));
    }

    @RateLimit(key = "auth-forgot-password", limit = 5, windowSeconds = 3600)
    @PostMapping("/forgot-password")
    public ResponseEntity<Void> forgotPassword(@Valid @RequestBody com.opas.dto.ForgotPasswordRequest request) {
        authService.requestPasswordReset(request.email());
        // 204 regardless of whether the email exists — no account enumeration.
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(@RequestHeader("Authorization") String authorization,
            @Valid @RequestBody RefreshRequest request) {
        authService.logout(authorization, request.refreshToken());
        return ResponseEntity.noContent().build();
    }

    @RateLimit(key = "auth-change-password", limit = 5, windowSeconds = 3600)
    @PostMapping("/change-password")
    public ResponseEntity<Void> changePassword(Authentication authentication,
            @Valid @RequestBody ChangePasswordRequest request) {
        String name = authentication.getName();
        if (name == null)
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        authService.changePassword(UUID.fromString(name), request.currentPassword(), request.newPassword());
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/account")
    public ResponseEntity<Void> deleteAccount(Authentication authentication) {
        String name = authentication.getName();
        if (name == null)
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        UUID userId = UUID.fromString(name);
        authService.deleteAccount(userId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/me")
    public ResponseEntity<UserResponse> me(Authentication authentication) {
        String name = authentication.getName();
        if (name == null)
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        return ResponseEntity.ok(authService.me(UUID.fromString(name)));
    }
}
