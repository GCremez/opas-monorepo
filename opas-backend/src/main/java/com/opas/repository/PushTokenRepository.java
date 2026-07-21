package com.opas.repository;

import com.opas.domain.PushToken;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PushTokenRepository extends JpaRepository<PushToken, UUID> {
    void deleteByUserIdAndToken(UUID userId, String token);
}
