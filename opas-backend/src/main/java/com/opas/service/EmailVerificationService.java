package com.opas.service;

import com.opas.domain.EmailVerificationCode;
import com.opas.domain.User;
import com.opas.repository.EmailVerificationCodeRepository;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.HexFormat;
import java.util.Optional;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Issues and checks one-time 6-digit email-verification codes. The plaintext code is
 * only ever emailed; the store keeps a SHA-256 digest, an expiry, and an attempt count.
 */
@Service
public class EmailVerificationService {

    private static final Duration CODE_TTL = Duration.ofMinutes(15);
    private static final int MAX_ATTEMPTS = 5;
    private static final int CODE_BOUND = 1_000_000; // 6 digits: 000000..999999

    private final EmailVerificationCodeRepository codeRepository;
    private final EmailService emailService;
    private final SecureRandom random = new SecureRandom();

    public EmailVerificationService(EmailVerificationCodeRepository codeRepository, EmailService emailService) {
        this.codeRepository = codeRepository;
        this.emailService = emailService;
    }

    /**
     * Generates a fresh code for the user, replacing any existing one, and emails it.
     * Called on registration and on resend.
     */
    @Transactional
    public void generateAndSend(User user) {
        String code = String.format("%06d", random.nextInt(CODE_BOUND));

        EmailVerificationCode entity = codeRepository.findById(user.getId())
                .orElseGet(() -> {
                    var c = new EmailVerificationCode();
                    c.setUserId(user.getId());
                    return c;
                });
        entity.setCodeHash(sha256Hex(code));
        entity.setExpiresAt(Instant.now().plus(CODE_TTL));
        entity.setAttempts(0);
        entity.setCreatedAt(Instant.now());
        codeRepository.save(entity);

        emailService.sendVerificationCode(user.getEmail(), code);
    }

    /**
     * Checks a submitted code for the user. Returns true and consumes the code on success.
     * On failure returns false and increments the attempt counter, deleting the code once
     * {@link #MAX_ATTEMPTS} is reached so it can't be brute-forced (the user must resend).
     */
    @Transactional
    public boolean verify(User user, String submittedCode) {
        Optional<EmailVerificationCode> maybe = codeRepository.findById(user.getId());
        if (maybe.isEmpty()) {
            return false;
        }
        EmailVerificationCode entity = maybe.get();

        if (Instant.now().isAfter(entity.getExpiresAt())) {
            codeRepository.delete(entity);
            return false;
        }
        if (entity.getAttempts() >= MAX_ATTEMPTS) {
            codeRepository.delete(entity);
            return false;
        }

        boolean matches = constantTimeEquals(entity.getCodeHash(), sha256Hex(submittedCode));
        if (!matches) {
            entity.setAttempts(entity.getAttempts() + 1);
            codeRepository.save(entity);
            return false;
        }

        codeRepository.delete(entity);
        return true;
    }

    private static boolean constantTimeEquals(String a, String b) {
        return MessageDigest.isEqual(a.getBytes(StandardCharsets.UTF_8), b.getBytes(StandardCharsets.UTF_8));
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
