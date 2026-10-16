package com.opas.service;

import com.opas.config.EmailNotVerifiedException;
import com.opas.config.JwtUtil;
import com.opas.config.ResourceNotFoundException;
import com.opas.domain.Document;
import com.opas.domain.Subscription;
import com.opas.domain.User;
import com.opas.dto.AuthResponse;
import com.opas.dto.LoginRequest;
import com.opas.dto.RefreshRequest;
import com.opas.dto.RegisterRequest;
import com.opas.dto.RegisterResponse;
import com.opas.dto.UserResponse;
import com.opas.repository.DecodeResultRepository;
import com.opas.repository.DocumentRepository;
import com.opas.repository.FolderRepository;
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
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final SubscriptionRepository subscriptionRepository;
    private final DecodeResultRepository decodeResultRepository;
    private final DocumentRepository documentRepository;
    private final FolderRepository folderRepository;
    private final StorageService storageService;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final RefreshTokenService refreshTokenService;
    private final TokenBlacklistService tokenBlacklistService;
    private final EmailVerificationService emailVerificationService;
    private final PasswordResetService passwordResetService;
    private final SubscriptionService subscriptionService;

    /**
     * A valid bcrypt hash computed once at startup. On login for a non-existent email
     * we still run bcrypt against this so response time is independent of whether the
     * account exists — closing the timing side-channel for account enumeration.
     */
    private final String dummyPasswordHash;

    public AuthService(UserRepository userRepository, SubscriptionRepository subscriptionRepository,
            DecodeResultRepository decodeResultRepository, DocumentRepository documentRepository,
            FolderRepository folderRepository,
            StorageService storageService, PasswordEncoder passwordEncoder, JwtUtil jwtUtil,
            RefreshTokenService refreshTokenService, TokenBlacklistService tokenBlacklistService,
            EmailVerificationService emailVerificationService, PasswordResetService passwordResetService,
            SubscriptionService subscriptionService) {
        this.userRepository = userRepository;
        this.subscriptionRepository = subscriptionRepository;
        this.decodeResultRepository = decodeResultRepository;
        this.documentRepository = documentRepository;
        this.folderRepository = folderRepository;
        this.storageService = storageService;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
        this.refreshTokenService = refreshTokenService;
        this.tokenBlacklistService = tokenBlacklistService;
        this.emailVerificationService = emailVerificationService;
        this.passwordResetService = passwordResetService;
        this.subscriptionService = subscriptionService;
        this.dummyPasswordHash = passwordEncoder.encode("opas-constant-time-login-placeholder");
    }

    @Transactional
    public RegisterResponse register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.email())) {
            // Generic message: do not confirm that the email is already registered
            // (account enumeration). Registration is also rate-limited (see AuthController).
            throw new IllegalArgumentException("Registration could not be completed");
        }

        User user = new User();
        user.setEmail(request.email());
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setName(request.name());
        user.setLanguage(normalizeLanguage(request.language()));
        // Hard verification gate: the account starts unverified and cannot log in until
        // the emailed code is confirmed. No tokens are issued here.
        user.setEmailVerified(false);
        user = userRepository.save(user);

        Subscription subscription = new Subscription();
        subscription.setUser(user);
        subscription.setTier("free");
        subscription.setStatus("active");
        subscriptionRepository.save(subscription);

        emailVerificationService.generateAndSend(user);

        return RegisterResponse.verificationRequired(user.getEmail());
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
        User user = maybeUser.get();
        if (!user.isEmailVerified()) {
            // Credentials are correct but the address is unverified. Surface a distinct
            // 403 so the client routes to the verification screen. This is only reachable
            // after a correct password, so it does not add an enumeration oracle beyond
            // what a successful login already reveals.
            throw new EmailNotVerifiedException("Email not verified");
        }
        return generateAuthResponse(user);
    }

    /**
     * Confirms an emailed verification code. On success the account is marked verified
     * and tokens are issued (the user is logged straight in). Uses a generic error on
     * every failure path so it can't be used to probe which emails are registered.
     */
    @Transactional
    public AuthResponse verifyEmail(String email, String code) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("Invalid or expired verification code"));
        if (user.isEmailVerified()) {
            // Never issue tokens here without a valid code: an already-verified account
            // must log in with its password. Same generic error as every other failure.
            throw new IllegalArgumentException("Invalid or expired verification code");
        }
        if (!emailVerificationService.verify(user, code)) {
            throw new IllegalArgumentException("Invalid or expired verification code");
        }
        user.setEmailVerified(true);
        userRepository.save(user);
        return generateAuthResponse(user);
    }

    /**
     * Re-sends a verification code. Behaves identically whether or not the email maps to
     * an existing unverified account, so it can't be used to enumerate accounts.
     */
    public void resendVerification(String email) {
        userRepository.findByEmail(email)
                .filter(u -> !u.isEmailVerified())
                .ifPresent(emailVerificationService::generateAndSend);
    }

    @Transactional
    public AuthResponse refresh(RefreshRequest request, @Nullable String authHeader) {
        // Revoke the caller's current access token as part of rotation so a
        // stolen-but-still-valid access token can't outlive the refresh.
        blacklistAccessToken(extractBearerToken(authHeader));
        Claims claims;
        try {
            claims = jwtUtil.parseToken(request.refreshToken());
        } catch (Exception e) {
            throw new IllegalArgumentException("Invalid refresh token");
        }
        String userId = claims.getSubject();
        if (userId == null || !JwtUtil.isRefreshToken(claims)) {
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
        // Best-effort blacklist of the access token. It may be absent or already
        // expired (an expired token is already unusable), so its state must not
        // block the real goal of logout: revoking the refresh token.
        blacklistAccessToken(extractBearerToken(authHeader));

        // Derive the account from the refresh token itself rather than the access
        // token, so logout still revokes the session when the access token is gone.
        if (refreshToken == null || refreshToken.isBlank()) {
            return;
        }
        try {
            Claims refreshClaims = jwtUtil.parseToken(refreshToken);
            String subject = refreshClaims.getSubject();
            if (subject != null && JwtUtil.isRefreshToken(refreshClaims)) {
                refreshTokenService.delete(subject, sha256Hex(refreshToken));
            }
        } catch (Exception ignored) {
            // Malformed/expired refresh token — nothing to revoke.
        }
    }

    /**
     * Adds a valid, unexpired access token's jti to the blacklist for its remaining
     * lifetime. No-op when the token is null, blank, malformed, or already expired.
     */
    private void blacklistAccessToken(@Nullable String accessToken) {
        if (accessToken == null || accessToken.isBlank()) {
            return;
        }
        Claims claims;
        try {
            claims = jwtUtil.parseToken(accessToken);
        } catch (Exception e) {
            return;
        }
        String jti = claims.getId();
        var expiration = claims.getExpiration();
        if (jti == null || jti.isBlank() || expiration == null) {
            return;
        }
        Duration remaining = Duration.between(Instant.now(), expiration.toInstant());
        if (remaining.isPositive()) {
            tokenBlacklistService.blacklist(jti, remaining);
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
        // Stop billing first. If Stripe fails this throws and nothing is deleted, so the user
        // can retry — never a deleted account that keeps getting charged.
        Optional<Subscription> subscription = subscriptionRepository.findByUserId(userId);
        subscription.ifPresent(subscriptionService::deleteBillingCustomer);

        List<String> s3Keys = documentRepository.findByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(Document::getS3Key).toList();
        decodeResultRepository.deleteByUser_Id(userId);
        documentRepository.deleteByUser_Id(userId);
        // folders.user_id has no ON DELETE cascade, so folders must be removed
        // explicitly or the final user delete fails the FK check.
        folderRepository.deleteByUser_Id(userId);
        subscription.ifPresent(subscriptionRepository::delete);
        refreshTokenService.invalidateAll(userId.toString());
        userRepository.deleteById(userId);
        // Remove the files only once the rows are really gone: deleting them mid-transaction
        // would leave an intact account with missing files if the commit then failed.
        runAfterCommit(() -> s3Keys.forEach(storageService::deleteObject));
    }

    private static void runAfterCommit(Runnable action) {
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    action.run();
                }
            });
        } else {
            action.run();
        }
    }

    /**
     * Begin a password reset. Behaves identically whether or not the email is
     * registered, so the endpoint can't be used to enumerate accounts: when the email
     * belongs to a real account a one-time 6-digit code is generated and emailed;
     * otherwise nothing happens and the caller still sees the same generic success.
     */
    public void requestPasswordReset(String email) {
        try {
            userRepository.findByEmail(email).ifPresent(passwordResetService::generateAndSend);
        } catch (IllegalStateException e) {
            // A mail failure only ever happens for a registered email, so surfacing it
            // (500 vs 204) would reveal which addresses have accounts. The failure is
            // already logged by EmailService; the user can simply request another code.
        }
    }

    /**
     * Completes a password reset. Consumes the one-time code, sets the new password, and
     * revokes every existing session (refresh tokens) so any attacker holding a live
     * session is kicked out. A correct code additionally verifies the email — reaching a
     * private inbox proves ownership just as the verification flow does. Uses a generic
     * error on every failure path so it can't be used to probe which emails are
     * registered or which codes are close.
     */
    @Transactional
    public void resetPassword(String email, String code, String newPassword) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("Invalid or expired reset code"));
        if (!passwordResetService.verifyAndConsume(user, code)) {
            throw new IllegalArgumentException("Invalid or expired reset code");
        }
        user.setPasswordHash(passwordEncoder.encode(newPassword));
        // A successful reset proves the user controls the inbox, so treat the address as
        // verified — otherwise a user who reset before verifying could still never log in.
        user.setEmailVerified(true);
        userRepository.save(user);
        // Revoke all existing refresh tokens: a reset is exactly the "I may be compromised"
        // moment, so no session opened before it may survive.
        refreshTokenService.invalidateAll(user.getId().toString());
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

    private static String extractBearerToken(String authHeader) {
        if (authHeader == null || !authHeader.regionMatches(true, 0, "Bearer ", 0, 7)) {
            return null;
        }
        return authHeader.substring(7).trim();
    }

    /** Accepts en/fi/sv (any case, with optional region like "fi-FI"); anything else falls back to English. */
    static String normalizeLanguage(@Nullable String language) {
        if (language == null || language.isBlank()) {
            return "en";
        }
        String code = language.trim().toLowerCase(java.util.Locale.ROOT);
        int sep = code.indexOf('-') >= 0 ? code.indexOf('-') : code.indexOf('_');
        if (sep > 0) {
            code = code.substring(0, sep);
        }
        return switch (code) {
            case "fi", "sv" -> code;
            default -> "en";
        };
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
