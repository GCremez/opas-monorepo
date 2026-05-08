package com.opas.repository;

import com.opas.domain.DecodeResult;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface DecodeResultRepository extends JpaRepository<DecodeResult, UUID> {
    Optional<DecodeResult> findByDocumentId(UUID documentId);
    long countByUserId(UUID userId);
}
