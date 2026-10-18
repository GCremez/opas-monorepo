package com.opas.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;
import org.springframework.lang.Nullable;

@Entity
@Table(name = "documents")
public class Document {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false)
    private String filename;

    @Column(name = "s3_key", nullable = false)
    private String s3Key;

    @Column(name = "content_type")
    private String contentType;

    @Column(name = "file_size")
    private Long fileSize;

    @Column(nullable = false)
    private String status;

    // Optional folder this document is filed under (nullable = unfiled). Maps the
    // existing folder_id column added in V6 so documents can actually be organized.
    @Column(name = "folder_id")
    private UUID folderId;

    // True once the user has filed (or unfiled) the document themselves; the AI's
    // suggested category is only applied while this is false.
    @Column(name = "folder_set_by_user", nullable = false)
    private boolean folderSetByUser;

    // First time the owner fetched the finished result. While null, the "letter is
    // ready" email may still go out (V15).
    @Column(name = "result_seen_at")
    private Instant resultSeenAt;

    // Set when that email is sent, so it goes out at most once.
    @Column(name = "ready_email_sent_at")
    private Instant readyEmailSentAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = Instant.now();
        updatedAt = Instant.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = Instant.now();
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
    }

    public String getFilename() {
        return filename;
    }

    public void setFilename(String filename) {
        this.filename = filename;
    }

    public String getS3Key() {
        return s3Key;
    }

    public void setS3Key(String s3Key) {
        this.s3Key = s3Key;
    }

    @Nullable
    public String getContentType() {
        return contentType;
    }

    public void setContentType(String contentType) {
        this.contentType = contentType;
    }

    @Nullable
    public Long getFileSize() {
        return fileSize;
    }

    public void setFileSize(Long fileSize) {
        this.fileSize = fileSize;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    @Nullable
    public UUID getFolderId() {
        return folderId;
    }

    public boolean isFolderSetByUser() {
        return folderSetByUser;
    }

    public void setFolderSetByUser(boolean folderSetByUser) {
        this.folderSetByUser = folderSetByUser;
    }

    public void setFolderId(UUID folderId) {
        this.folderId = folderId;
    }

    public Instant getResultSeenAt() {
        return resultSeenAt;
    }

    public Instant getReadyEmailSentAt() {
        return readyEmailSentAt;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
