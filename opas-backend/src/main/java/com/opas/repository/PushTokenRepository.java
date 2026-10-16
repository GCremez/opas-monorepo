package com.opas.repository;

import com.opas.domain.PushToken;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface PushTokenRepository extends JpaRepository<PushToken, UUID> {
    void deleteByUserIdAndToken(UUID userId, String token);

    List<PushToken> findByUserId(UUID userId);

    // Distinct user ids that have at least one push token, so scheduled jobs iterate
    // users instead of loading every token row (an N+1 fanout across the whole table).
    @Query("select distinct pt.user.id from PushToken pt")
    List<UUID> findDistinctUserIds();

    // Remove a specific token (e.g. one Expo reported as no longer registered).
    void deleteByToken(String token);
}
