package com.opas.repository;

import com.opas.domain.Document;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface DocumentRepository extends JpaRepository<Document, UUID> {
    List<Document> findByUserIdOrderByCreatedAtDesc(UUID userId);
    long countByUserId(UUID userId);
}
