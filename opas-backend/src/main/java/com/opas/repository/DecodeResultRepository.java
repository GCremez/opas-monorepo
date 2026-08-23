package com.opas.repository;

import com.opas.domain.DecodeResult;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DecodeResultRepository extends JpaRepository<DecodeResult, UUID> {
    List<DecodeResult> findByDocumentId(UUID documentId);

    long countByUserId(UUID userId);

    void deleteByDocumentId(UUID documentId);

    void deleteByUser_Id(UUID userId);
}
