package com.opas.repository;

import com.opas.domain.Document;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DocumentRepository extends JpaRepository<Document, UUID> {

    List<Document> findByUserIdOrderByCreatedAtDesc(UUID userId);

    List<Document> findByUserIdAndStatusNotOrderByCreatedAtDesc(UUID userId, String status);

    long countByUserId(UUID userId);

    void deleteByUser_Id(UUID userId);
}