package com.opas.repository;

import com.opas.domain.PasswordResetCode;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PasswordResetCodeRepository extends JpaRepository<PasswordResetCode, UUID> {

    /**
     * Uses up one guess, in a single UPDATE. Returns 1 when a guess was still available and
     * 0 when the cap is reached. Reading the count, comparing and saving it back let
     * parallel requests all read the same count and each get a guess.
     */
    @Modifying
    @Query("update PasswordResetCode c set c.attempts = c.attempts + 1 where c.userId = :userId and c.attempts < :max")
    int claimAttempt(@Param("userId") UUID userId, @Param("max") int max);

    /**
     * Removes the user's code and returns how many rows went (0 or 1). A plain DELETE, so
     * two requests removing the same code at once don't fail each other, and only one of
     * them sees 1: a code can be used once.
     */
    @Modifying
    @Query("delete from PasswordResetCode c where c.userId = :userId")
    int removeCode(@Param("userId") UUID userId);
}
