package com.opas.repository;

import com.opas.domain.DecodeResult;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface DecodeResultRepository extends JpaRepository<DecodeResult, UUID> {
    List<DecodeResult> findByDocumentId(UUID documentId);
    long countByUserId(UUID userId);
}
