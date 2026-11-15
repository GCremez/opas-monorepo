package com.opas.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.opas.config.JwtUtil;
import com.opas.domain.User;
import com.opas.repository.UserRepository;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

/**
 * The guess cap on emailed 6-digit codes, through the real AuthService transactions and
 * real Postgres. Mocks can't cover this: a wrong code makes AuthService throw, and what
 * matters is whether the counted guess survives that.
 */
@DataJpaTest
@Testcontainers
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import({AuthService.class, PasswordResetService.class, EmailVerificationService.class})
// Each call must commit or roll back on its own, as a request does.
@Transactional(propagation = Propagation.NOT_SUPPORTED)
class OneTimeCodeAttemptsTest {

    @Container
    @SuppressWarnings("resource")
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("pgvector/pgvector:pg16");

    @DynamicPropertySource
    static void datasource(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }

    @MockBean
    private EmailService emailService;
    @MockBean
    private StorageService storageService;
    @MockBean
    private PasswordEncoder passwordEncoder;
    @MockBean
    private JwtUtil jwtUtil;
    @MockBean
    private RefreshTokenService refreshTokenService;
    @MockBean
    private TokenBlacklistService tokenBlacklistService;
    @MockBean
    private SubscriptionService subscriptionService;

    @Autowired
    private AuthService authService;
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private JdbcTemplate jdbc;

    private String email;

    @BeforeEach
    void user() {
        when(passwordEncoder.encode(anyString())).thenReturn("hash");
        when(jwtUtil.createAccessToken(anyString(), anyString())).thenReturn("access");
        when(jwtUtil.createRefreshToken(anyString())).thenReturn("refresh");
        email = "codes-" + System.nanoTime() + "@example.com";
        User user = new User();
        user.setEmail(email);
        user.setPasswordHash("old-hash");
        user.setName("Codes");
        user.setLanguage("en");
        user.setEmailVerified(false);
        userRepository.save(user);
    }

    private String resetCode() {
        authService.requestPasswordReset(email);
        ArgumentCaptor<String> code = ArgumentCaptor.forClass(String.class);
        verify(emailService, atLeastOnce()).sendPasswordResetCode(eq(email), code.capture(), any());
        return code.getValue();
    }

    private static String wrong(String real, int i) {
        String guess = String.format("%06d", i);
        return guess.equals(real) ? "999999" : guess;
    }

    private String passwordHash() {
        return jdbc.queryForObject("select password_hash from users where email = ?", String.class, email);
    }

    @Test
    void resetCodeIsDeadAfterFiveWrongGuesses() {
        String code = resetCode();
        for (int i = 0; i < 5; i++) {
            int n = i;
            assertThrows(IllegalArgumentException.class,
                    () -> authService.resetPassword(email, wrong(code, n), "new-password"));
        }
        // The attacker's sixth guess happens to be the right one: it must not work.
        assertThrows(IllegalArgumentException.class, () -> authService.resetPassword(email, code, "new-password"));
        assertEquals("old-hash", passwordHash());
    }

    @Test
    void verificationCodeIsDeadAfterFiveWrongGuesses() {
        authService.resendVerification(email);
        ArgumentCaptor<String> captor = ArgumentCaptor.forClass(String.class);
        verify(emailService, atLeastOnce()).sendVerificationCode(eq(email), captor.capture(), any());
        String code = captor.getValue();
        for (int i = 0; i < 5; i++) {
            int n = i;
            assertThrows(IllegalArgumentException.class, () -> authService.verifyEmail(email, wrong(code, n)));
        }
        assertThrows(IllegalArgumentException.class, () -> authService.verifyEmail(email, code));
        assertEquals(Boolean.FALSE,
                jdbc.queryForObject("select email_verified from users where email = ?", Boolean.class, email));
    }

    @Test
    void parallelGuessesShareOneCap() throws Exception {
        String code = resetCode();
        int guesses = 40;
        var pool = Executors.newFixedThreadPool(guesses);
        var start = new CountDownLatch(1);
        List<Future<Boolean>> results = new ArrayList<>();
        for (int i = 0; i < guesses; i++) {
            int n = i;
            Callable<Boolean> guess = () -> {
                start.await();
                try {
                    authService.resetPassword(email, wrong(code, n), "new-password");
                    return true;
                } catch (IllegalArgumentException e) {
                    return false;
                }
            };
            results.add(pool.submit(guess));
        }
        start.countDown();
        for (Future<Boolean> result : results) {
            assertFalse(result.get());
        }
        pool.shutdown();

        // Forty requests at once used up the five guesses between them, not five each.
        Integer attempts = jdbc.query("select attempts from password_reset_codes c join users u on u.id = c.user_id "
                + "where u.email = ?", rs -> rs.next() ? rs.getInt(1) : null, email);
        assertTrue(attempts == null || attempts <= 5, "attempts=" + attempts);
        assertThrows(IllegalArgumentException.class, () -> authService.resetPassword(email, code, "new-password"));
        assertEquals("old-hash", passwordHash());
    }

    @Test
    void rightCodeStillWorksAfterAFewWrongOnes() {
        String code = resetCode();
        assertThrows(IllegalArgumentException.class, () -> authService.resetPassword(email, wrong(code, 1), "pw-12345"));
        assertThrows(IllegalArgumentException.class, () -> authService.resetPassword(email, wrong(code, 2), "pw-12345"));
        authService.resetPassword(email, code, "new-password");
        assertEquals("hash", passwordHash());
    }
}
