package com.opas.service;

import com.opas.config.ResourceNotFoundException;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.opas.config.JwtUtil;
import com.opas.domain.Document;
import com.opas.domain.Subscription;
import com.opas.domain.User;
import com.opas.config.EmailNotVerifiedException;
import com.opas.dto.AuthResponse;
import com.opas.dto.LoginRequest;
import com.opas.dto.RefreshRequest;
import com.opas.dto.RegisterRequest;
import com.opas.dto.RegisterResponse;
import com.opas.repository.DecodeResultRepository;
import com.opas.repository.DocumentRepository;
import com.opas.repository.SubscriptionRepository;
import com.opas.repository.UserRepository;
import io.jsonwebtoken.Claims;
import java.time.Duration;
import java.time.Instant;
import java.util.Date;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UserRepository userRepository;
    @Mock
    private SubscriptionRepository subscriptionRepository;
    @Mock
    private DecodeResultRepository decodeResultRepository;
    @Mock
    private DocumentRepository documentRepository;
    @Mock
    private com.opas.repository.FolderRepository folderRepository;
    @Mock
    private StorageService storageService;
    @Mock
    private PasswordEncoder passwordEncoder;
    @Mock
    private JwtUtil jwtUtil;
    @Mock
    private RefreshTokenService refreshTokenService;
    @Mock
    private TokenBlacklistService tokenBlacklistService;
    @Mock
    private EmailVerificationService emailVerificationService;
    @Mock
    private Claims claims;

    @Captor
    private ArgumentCaptor<User> userCaptor;
    @Captor
    private ArgumentCaptor<Subscription> subscriptionCaptor;
    @Captor
    private ArgumentCaptor<String> stringCaptor;

    private AuthService service;
    private UUID userId;
    private User user;
    private Subscription subscription;

    @BeforeEach
    void setUp() {
        service = new AuthService(userRepository, subscriptionRepository, decodeResultRepository,
                documentRepository, folderRepository, storageService, passwordEncoder, jwtUtil, refreshTokenService,
                tokenBlacklistService, emailVerificationService);
        userId = UUID.randomUUID();
        user = new User();
        user.setId(userId);
        user.setEmail("test@example.com");
        user.setPasswordHash("hashed-password");
        user.setName("Test User");
        user.setEmailVerified(true);
        subscription = new Subscription();
        subscription.setUser(user);
        subscription.setTier("free");
        subscription.setStatus("active");
    }

    // --- register ---

    @Test
    void registerCreatesUnverifiedUserAndSendsCode() {
        when(userRepository.existsByEmail("new@example.com")).thenReturn(false);
        when(passwordEncoder.encode("password123")).thenReturn("hashed-password");
        when(userRepository.save(any())).thenAnswer(invocation -> {
            User u = invocation.getArgument(0);
            u.setId(userId);
            return u;
        });
        when(subscriptionRepository.save(any())).thenReturn(subscription);

        RegisterResponse response = service.register(new RegisterRequest("new@example.com", "password123", "New User", null));

        assertNotNull(response);
        assertTrue(response.verificationRequired());
        assertEquals("new@example.com", response.email());
        // No tokens are issued at registration — the user is not logged in.
        verify(jwtUtil, never()).createAccessToken(anyString(), anyString());
        verify(userRepository).save(userCaptor.capture());
        assertEquals("New User", userCaptor.getValue().getName());
        assertFalse(userCaptor.getValue().isEmailVerified());
        verify(subscriptionRepository).save(subscriptionCaptor.capture());
        assertEquals("free", subscriptionCaptor.getValue().getTier());
        verify(emailVerificationService).generateAndSend(any(User.class));
    }

    @Test
    void registerThrowsWhenEmailExists() {
        when(userRepository.existsByEmail("existing@example.com")).thenReturn(true);

        assertThrows(IllegalArgumentException.class,
                () -> service.register(new RegisterRequest("existing@example.com", "password123", "User", null)));
    }

    // --- verify-email ---

    @Test
    void verifyEmailMarksVerifiedAndIssuesTokens() {
        user.setEmailVerified(false);
        when(userRepository.findByEmail("test@example.com")).thenReturn(Optional.of(user));
        when(emailVerificationService.verify(user, "123456")).thenReturn(true);
        when(subscriptionRepository.findByUserId(userId)).thenReturn(Optional.of(subscription));
        when(jwtUtil.createAccessToken(userId.toString(), "test@example.com")).thenReturn("access-token");
        when(jwtUtil.createRefreshToken(userId.toString())).thenReturn("refresh-token");

        AuthResponse response = service.verifyEmail("test@example.com", "123456");

        assertEquals("access-token", response.getAccessToken());
        assertTrue(user.isEmailVerified());
        verify(userRepository).save(user);
    }

    @Test
    void verifyEmailThrowsOnWrongCode() {
        user.setEmailVerified(false);
        when(userRepository.findByEmail("test@example.com")).thenReturn(Optional.of(user));
        when(emailVerificationService.verify(user, "000000")).thenReturn(false);

        assertThrows(IllegalArgumentException.class, () -> service.verifyEmail("test@example.com", "000000"));
        verify(userRepository, never()).save(any());
    }

    @Test
    void verifyEmailThrowsOnUnknownEmail() {
        when(userRepository.findByEmail("nobody@example.com")).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class, () -> service.verifyEmail("nobody@example.com", "123456"));
    }

    // --- resend-verification ---

    @Test
    void resendVerificationSendsForUnverifiedUser() {
        user.setEmailVerified(false);
        when(userRepository.findByEmail("test@example.com")).thenReturn(Optional.of(user));

        service.resendVerification("test@example.com");

        verify(emailVerificationService).generateAndSend(user);
    }

    @Test
    void resendVerificationDoesNothingForVerifiedUser() {
        when(userRepository.findByEmail("test@example.com")).thenReturn(Optional.of(user));

        service.resendVerification("test@example.com");

        verify(emailVerificationService, never()).generateAndSend(any());
    }

    @Test
    void resendVerificationDoesNothingForUnknownEmail() {
        when(userRepository.findByEmail("nobody@example.com")).thenReturn(Optional.empty());

        service.resendVerification("nobody@example.com");

        verify(emailVerificationService, never()).generateAndSend(any());
    }

    // --- login ---

    @Test
    void loginSucceedsWithValidCredentials() {
        when(userRepository.findByEmail("test@example.com")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("password123", "hashed-password")).thenReturn(true);
        when(subscriptionRepository.findByUserId(userId)).thenReturn(Optional.of(subscription));
        when(jwtUtil.createAccessToken(userId.toString(), "test@example.com")).thenReturn("access-token");
        when(jwtUtil.createRefreshToken(userId.toString())).thenReturn("refresh-token");

        AuthResponse response = service.login(new LoginRequest("test@example.com", "password123"));

        assertEquals("access-token", response.getAccessToken());
        assertEquals("refresh-token", response.getRefreshToken());
    }

    @Test
    void loginThrowsWhenUserNotFound() {
        when(userRepository.findByEmail("unknown@example.com")).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class,
                () -> service.login(new LoginRequest("unknown@example.com", "password123")));
    }

    @Test
    void loginThrowsWhenEmailNotVerified() {
        user.setEmailVerified(false);
        when(userRepository.findByEmail("test@example.com")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("password123", "hashed-password")).thenReturn(true);

        assertThrows(EmailNotVerifiedException.class,
                () -> service.login(new LoginRequest("test@example.com", "password123")));
        verify(jwtUtil, never()).createAccessToken(anyString(), anyString());
    }

    @Test
    void loginThrowsWhenPasswordWrong() {
        when(userRepository.findByEmail("test@example.com")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("wrong-password", "hashed-password")).thenReturn(false);

        assertThrows(IllegalArgumentException.class,
                () -> service.login(new LoginRequest("test@example.com", "wrong-password")));
    }

    // --- refresh ---

    @Test
    void refreshSucceedsWithValidToken() {
        when(jwtUtil.parseToken("valid-refresh-token")).thenReturn(claims);
        when(claims.getSubject()).thenReturn(userId.toString());
        when(refreshTokenService.consume(userId.toString(), sha256Hex("valid-refresh-token"))).thenReturn(true);
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(subscriptionRepository.findByUserId(userId)).thenReturn(Optional.of(subscription));
        when(jwtUtil.createAccessToken(userId.toString(), "test@example.com")).thenReturn("new-access-token");
        when(jwtUtil.createRefreshToken(userId.toString())).thenReturn("new-refresh-token");

        AuthResponse response = service.refresh(new RefreshRequest("valid-refresh-token"));

        assertEquals("new-access-token", response.getAccessToken());
        verify(refreshTokenService).consume(userId.toString(), sha256Hex("valid-refresh-token"));
    }

    @Test
    void refreshThrowsWhenTokenInvalid() {
        when(jwtUtil.parseToken("bad-token")).thenThrow(new RuntimeException("Bad token"));

        assertThrows(IllegalArgumentException.class,
                () -> service.refresh(new RefreshRequest("bad-token")));
    }

    @Test
    void refreshThrowsWhenSubjectNull() {
        when(jwtUtil.parseToken("no-subject-token")).thenReturn(claims);
        when(claims.getSubject()).thenReturn(null);

        assertThrows(IllegalArgumentException.class,
                () -> service.refresh(new RefreshRequest("no-subject-token")));
    }

    @Test
    void refreshThrowsWhenTokenNotInStore() {
        when(jwtUtil.parseToken("unused-token")).thenReturn(claims);
        when(claims.getSubject()).thenReturn(userId.toString());
        when(refreshTokenService.consume(anyString(), anyString())).thenReturn(false);

        assertThrows(IllegalArgumentException.class,
                () -> service.refresh(new RefreshRequest("unused-token")));
    }

    @Test
    void refreshThrowsWhenUserNotFound() {
        when(jwtUtil.parseToken("valid-token")).thenReturn(claims);
        when(claims.getSubject()).thenReturn(userId.toString());
        when(refreshTokenService.consume(anyString(), anyString())).thenReturn(true);
        when(userRepository.findById(userId)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class,
                () -> service.refresh(new RefreshRequest("valid-token")));
    }

    // --- logout ---

    @Test
    void logoutBlacklistsAccessTokenAndDeletesRefreshToken() {
        when(jwtUtil.parseToken("valid-access-token")).thenReturn(claims);
        when(claims.getId()).thenReturn("token-jti");
        when(claims.getExpiration()).thenReturn(Date.from(Instant.now().plusSeconds(3600)));
        when(claims.getSubject()).thenReturn(userId.toString());

        service.logout("Bearer valid-access-token", "refresh-token-value");

        verify(tokenBlacklistService).blacklist(eq("token-jti"), any(Duration.class));
        verify(refreshTokenService).delete(userId.toString(), sha256Hex("refresh-token-value"));
    }

    @Test
    void logoutSkipsBlacklistWhenExpirationIsPast() {
        when(jwtUtil.parseToken("expired-token")).thenReturn(claims);
        when(claims.getId()).thenReturn("token-jti");
        when(claims.getExpiration()).thenReturn(Date.from(Instant.now().minusSeconds(3600)));

        service.logout("Bearer expired-token", "refresh-token-value");

        verify(tokenBlacklistService, never()).blacklist(anyString(), any());
    }

    @Test
    void logoutSkipsBlacklistWhenJtiNull() {
        when(jwtUtil.parseToken("no-jti-token")).thenReturn(claims);
        when(claims.getId()).thenReturn(null);

        service.logout("Bearer no-jti-token", "refresh-token-value");

        verify(tokenBlacklistService, never()).blacklist(anyString(), any());
    }

    @Test
    void logoutSkipsRefreshDeletionWhenSubjectNull() {
        when(jwtUtil.parseToken("valid-token")).thenReturn(claims);
        when(claims.getId()).thenReturn("token-jti");
        when(claims.getExpiration()).thenReturn(Date.from(Instant.now().plusSeconds(3600)));
        when(claims.getSubject()).thenReturn(null);

        service.logout("Bearer valid-token", "refresh-token");

        verify(refreshTokenService, never()).delete(anyString(), anyString());
    }

    @Test
    void logoutThrowsWhenAuthHeaderMissing() {
        assertThrows(IllegalArgumentException.class,
                () -> service.logout(null, "refresh-token"));
    }

    @Test
    void logoutThrowsWhenAuthHeaderMalformed() {
        assertThrows(IllegalArgumentException.class,
                () -> service.logout("Basic token", "refresh-token"));
    }

    @Test
    void logoutThrowsWhenTokenInvalid() {
        when(jwtUtil.parseToken("bad-token")).thenThrow(new RuntimeException("Bad token"));

        assertThrows(IllegalArgumentException.class,
                () -> service.logout("Bearer bad-token", "refresh-token"));
    }

    @Test
    void logoutHandlesEmptyRefreshToken() {
        when(jwtUtil.parseToken("valid-token")).thenReturn(claims);
        when(claims.getId()).thenReturn("jti");
        when(claims.getExpiration()).thenReturn(Date.from(Instant.now().plusSeconds(3600)));

        service.logout("Bearer valid-token", null);

        verify(tokenBlacklistService).blacklist(anyString(), any());
        verify(refreshTokenService, never()).delete(anyString(), anyString());
    }

    // --- deleteAccount ---

    @Test
    void deleteAccountRemovesAllUserData() {
        UUID docId = UUID.randomUUID();
        Document doc = new Document();
        doc.setId(docId);
        doc.setS3Key("s3-key");
        when(userRepository.existsById(userId)).thenReturn(true);
        when(documentRepository.findByUserIdOrderByCreatedAtDesc(userId)).thenReturn(List.of(doc));
        when(subscriptionRepository.findByUserId(userId)).thenReturn(Optional.of(subscription));

        service.deleteAccount(userId);

        verify(decodeResultRepository).deleteByUser_Id(userId);
        verify(storageService).deleteObject("s3-key");
        verify(documentRepository).deleteByUser_Id(userId);
        verify(folderRepository).deleteByUser_Id(userId);
        verify(subscriptionRepository).delete(subscription);
        verify(refreshTokenService).invalidateAll(userId.toString());
        verify(userRepository).deleteById(userId);
    }

    @Test
    void deleteAccountIsIdempotentWhenUserNotFound() {
        when(userRepository.existsById(userId)).thenReturn(false);

        service.deleteAccount(userId);

        verify(documentRepository, never()).findByUserIdOrderByCreatedAtDesc(any());
        verify(userRepository, never()).deleteById(any());
    }

    @Test
    void deleteAccountHandlesMissingSubscription() {
        when(userRepository.existsById(userId)).thenReturn(true);
        when(documentRepository.findByUserIdOrderByCreatedAtDesc(userId)).thenReturn(List.of());
        when(subscriptionRepository.findByUserId(userId)).thenReturn(Optional.empty());

        service.deleteAccount(userId);

        verify(subscriptionRepository, never()).delete(any());
        verify(userRepository).deleteById(userId);
    }

    private static String sha256Hex(String value) {
        try {
            var digest = java.security.MessageDigest.getInstance("SHA-256");
            return java.util.HexFormat.of().formatHex(digest.digest(value.getBytes(java.nio.charset.StandardCharsets.UTF_8)));
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    @Test
    void normalizeLanguageKeepsSupportedCodesAndDefaultsToEnglish() {
        assertEquals("fi", AuthService.normalizeLanguage("fi"));
        assertEquals("sv", AuthService.normalizeLanguage("SV-fi"));
        assertEquals("fi", AuthService.normalizeLanguage("fi_FI"));
        assertEquals("en", AuthService.normalizeLanguage("de"));
        assertEquals("en", AuthService.normalizeLanguage(" "));
        assertEquals("en", AuthService.normalizeLanguage(null));
    }
}
