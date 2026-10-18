package com.opas.repository;

import com.opas.domain.Document;
import java.time.Instant;
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

    // Bulk updates so marking a document never bumps its updated_at.
    @Modifying
    @Query("update Document d set d.resultSeenAt = :now where d.id = :id and d.resultSeenAt is null")
    int markResultSeen(@Param("id") UUID id, @Param("now") Instant now);

    /**
     * Ready documents whose result nobody has opened, decoded between {@code after} and
     * {@code before}. The lower bound keeps a backlog (or a long outage) from turning into
     * a burst of stale emails.
     */
    @Query("""
            select d.id from Document d
            where d.status = 'ready' and d.resultSeenAt is null and d.readyEmailSentAt is null
              and exists (select r.id from DecodeResult r
                          where r.document = d and r.completedAt < :before and r.completedAt > :after)
            """)
    List<UUID> findUnseenReadyIds(@Param("before") Instant before, @Param("after") Instant after);

    /** Claims a document for the backup email; 1 only for the caller that gets to send it. */
    @Modifying
    @Query("""
            update Document d set d.readyEmailSentAt = :now
            where d.id = :id and d.readyEmailSentAt is null and d.resultSeenAt is null
            """)
    int claimReadyEmail(@Param("id") UUID id, @Param("now") Instant now);
}