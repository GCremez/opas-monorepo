package com.opas.controller;

import com.opas.config.RateLimit;
import com.opas.dto.AuthResponse;
import com.opas.dto.ChangePasswordRequest;
import com.opas.dto.LoginRequest;
import com.opas.dto.RefreshRequest;
import com.opas.dto.RegisterRequest;
import com.opas.dto.UserResponse;
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
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(authService.register(request));
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
