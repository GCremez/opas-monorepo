package com.opas.repository;

import com.opas.domain.Document;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface DocumentRepository extends JpaRepository<Document, UUID> {

    List<Document> findByUserIdOrderByCreatedAtDesc(UUID userId);

    // Detach every document from a folder so the folder can be deleted without
    // violating the documents.folder_id foreign key. Documents become "unfiled".
    @Modifying(clearAutomatically = true)
    @Query("update Document d set d.folderId = null where d.folderId = :folderId")
    void clearFolder(@Param("folderId") UUID folderId);

    List<Document> findByUserIdAndStatusNotOrderByCreatedAtDesc(UUID userId, String status);

    long countByUserId(UUID userId);

    long countByFolderId(UUID folderId);

    long countByUserIdAndStatus(UUID userId, String status);

    long countByUserIdAndStatusAndCreatedAtBefore(UUID userId, String status, java.time.Instant createdAt);

    long countByUserIdAndStatusNot(UUID userId, String status);

    void deleteByUser_Id(UUID userId);
}