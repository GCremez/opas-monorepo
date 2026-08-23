package com.opas.repository;

import com.opas.domain.EmailVerificationCode;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EmailVerificationCodeRepository extends JpaRepository<EmailVerificationCode, UUID> {
}
