package com.opas.repository;

import com.opas.domain.PasswordResetCode;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PasswordResetCodeRepository extends JpaRepository<PasswordResetCode, UUID> {
}
