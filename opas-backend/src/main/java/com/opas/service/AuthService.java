package com.opas.service;

import com.opas.config.JwtUtil;
import com.opas.config.ResourceNotFoundException;
import com.opas.domain.Document;
import com.opas.domain.Subscription;
import com.opas.domain.User;
import com.opas.dto.AuthResponse;
import com.opas.dto.LoginRequest;
import com.opas.dto.RefreshRequest;
import com.opas.dto.RegisterRequest;
import com.opas.dto.UserResponse;
import com.opas.repository.DecodeResultRepository;
import com.opas.repository.DocumentRepository;
import com.opas.repository.SubscriptionRepository;
import com.opas.repository.UserRepository;
import io.jsonwebtoken.Claims;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Duration;
import java.time.Instant;
import java.util.HexFormat;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.lang.Nullable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {
    private final UserRepository userRepository;
    private final SubscriptionRepository subscriptionRepository;
    private final DecodeResultRepository decodeResultRepository;
    private final DocumentRepository documentRepository;
    private final StorageService storageService;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final RefreshTokenService refreshTokenService;
    private final TokenBlacklistService tokenBlacklistService;

    /**
     * A valid bcrypt hash computed once at startup. On login for a non-existent email
     * we still run bcrypt against this so response time is independent of whether the
     * account exists — closing the timing side-channel for account enumeration.
     */
    private final String dummyPasswordHash;

    public AuthService(UserRepository userRepository, SubscriptionRepository subscriptionRepository,
            DecodeResultRepository decodeResultRepository, DocumentRepository documentRepository,
            StorageService storageService, PasswordEncoder passwordEncoder, JwtUtil jwtUtil,
            RefreshTokenService refreshTokenService, TokenBlacklistService tokenBlacklistService) {
        this.userRepository = userRepository;
        this.subscriptionRepository = subscriptionRepository;
        this.decodeResultRepository = decodeResultRepository;
        this.documentRepository = documentRepository;
        this.storageService = storageService;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
        this.refreshTokenService = refreshTokenService;
        this.tokenBlacklistService = tokenBlacklistService;
        this.dummyPasswordHash = passwordEncoder.encode("opas-constant-time-login-placeholder");
    }

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.email())) {
            // Generic message: do not confirm that the email is already registered
            // (account enumeration). Registration is also rate-limited (see AuthController).
            throw new IllegalArgumentException("Registration could not be completed");
        }

        User user = new User();
        user.setEmail(request.email());
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setName(request.name());
        user = userRepository.save(user);

        Subscription subscription = new Subscription();
        subscription.setUser(user);
        subscription.setTier("free");
        subscription.setStatus("active");
        subscriptionRepository.save(subscription);

        return generateAuthResponse(user);
    }

    public AuthResponse login(LoginRequest request) {
        Optional<User> maybeUser = userRepository.findByEmail(request.email());
        // Always perform a bcrypt comparison — against the real hash if the user
        // exists, otherwise against a dummy hash — so the response time does not
        // reveal whether the email is registered (timing account enumeration).
        String hash = maybeUser.map(User::getPasswordHash).orElse(dummyPasswordHash);
        boolean matches = passwordEncoder.matches(request.password(), hash);
        if (maybeUser.isEmpty() || !matches) {
            throw new IllegalArgumentException("Invalid email or password");
        }
        return generateAuthResponse(maybeUser.get());
    }

    @Transactional
    public AuthResponse refresh(RefreshRequest request) {
        Claims claims;
        try {
            claims = jwtUtil.parseToken(request.refreshToken());
        } catch (Exception e) {
            throw new IllegalArgumentException("Invalid refresh token");
        }
        String userId = claims.getSubject();
        if (userId == null) {
            throw new IllegalArgumentException("Invalid refresh token");
        }
        String hash = sha256Hex(request.refreshToken());
        if (!refreshTokenService.consume(userId, hash)) {
            // The token is validly signed and unexpired, yet not in the store: it has
            // already been rotated away. This is the classic refresh-token replay signal.
            // Invalidate the whole family so a stolen-then-rotated token can't be used.
            refreshTokenService.invalidateAll(userId);
            throw new IllegalArgumentException("Invalid refresh token");
        }
        User user = userRepository.findById(UUID.fromString(userId))
                .orElseThrow(ResourceNotFoundException::new);
        return generateAuthResponse(user);
    }

    public void logout(String authHeader, String refreshToken) {
        String accessToken = extractBearerToken(authHeader);
        if (accessToken == null || accessToken.isBlank()) {
            throw new IllegalArgumentException("Missing or invalid Authorization header");
        }
        Claims claims;
        try {
            claims = jwtUtil.parseToken(accessToken);
        } catch (Exception e) {
            throw new IllegalArgumentException("Invalid access token");
        }
        String jti = claims.getId();
        var expiration = claims.getExpiration();
        if (jti == null || jti.isBlank() || expiration == null) {
            return;
        }
        Instant exp = expiration.toInstant();
        Duration remaining = Duration.between(Instant.now(), exp);
        if (remaining.isPositive()) {
            tokenBlacklistService.blacklist(jti, remaining);
        }
        if (refreshToken != null && !refreshToken.isBlank()) {
            String subject = claims.getSubject();
            if (subject != null) {
                refreshTokenService.delete(subject, sha256Hex(refreshToken));
            }
        }
    }

    /**
     * Erases the user's application data and account (GDPR-style deletion). Idempotent if the user no longer exists.
     */
    @Transactional
    public void deleteAccount(UUID userId) {
        if (!userRepository.existsById(userId)) {
            return;
        }
        List<Document> documents = documentRepository.findByUserIdOrderByCreatedAtDesc(userId);
        decodeResultRepository.deleteByUser_Id(userId);
        for (Document document : documents) {
            storageService.deleteObject(document.getS3Key());
        }
        documentRepository.deleteByUser_Id(userId);
        subscriptionRepository.findByUserId(userId).ifPresent(subscriptionRepository::delete);
        refreshTokenService.invalidateAll(userId.toString());
        userRepository.deleteById(userId);
    }

    @Transactional
    public void changePassword(UUID userId, String currentPassword, String newPassword) {
        User user = userRepository.findById(userId)
                .orElseThrow(ResourceNotFoundException::new);
        if (!passwordEncoder.matches(currentPassword, user.getPasswordHash())) {
            throw new IllegalArgumentException("Current password is incorrect");
        }
        user.setPasswordHash(passwordEncoder.encode(newPassword));
        userRepository.save(user);
        // Revoke all existing refresh tokens so a session opened with the old
        // password (e.g. an attacker's) cannot survive the password change.
        refreshTokenService.invalidateAll(userId.toString());
    }

    public UserResponse me(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(ResourceNotFoundException::new);
        String plan = subscriptionRepository.findByUserId(user.getId()).map(Subscription::getTier).orElse("free");
        return UserResponse.from(user, plan);
    }

    private AuthResponse generateAuthResponse(User user) {
        String plan = subscriptionRepository.findByUserId(user.getId()).map(Subscription::getTier).orElse("free");
        String userId = user.getId().toString();
        String accessToken = jwtUtil.createAccessToken(userId, user.getEmail());
        String refreshToken = jwtUtil.createRefreshToken(userId);
        refreshTokenService.store(userId, sha256Hex(refreshToken));
        return new AuthResponse(accessToken, refreshToken, plan, UserResponse.from(user, plan));
    }

    @Nullable
    private static String extractBearerToken(String authHeader) {
        if (authHeader == null || !authHeader.regionMatches(true, 0, "Bearer ", 0, 7)) {
            return null;
        }
        return authHeader.substring(7).trim();
    }

    private static String sha256Hex(String value) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }
}
