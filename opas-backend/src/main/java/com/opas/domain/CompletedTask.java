package com.opas.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/** A deadline or action from a document that the user has marked done. */
@Entity
@Table(name = "completed_tasks")
public class CompletedTask {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "document_id", nullable = false)
    private UUID documentId;

    @Column(name = "task_key", nullable = false, length = 512)
    private String taskKey;

    @Column(name = "completed_at", nullable = false, updatable = false)
    private Instant completedAt;

    @PrePersist
    protected void onCreate() {
        completedAt = Instant.now();
    }

    public UUID getId() { return id; }
    public UUID getDocumentId() { return documentId; }
    public void setDocumentId(UUID documentId) { this.documentId = documentId; }
    public String getTaskKey() { return taskKey; }
    public void setTaskKey(String taskKey) { this.taskKey = taskKey; }
    public Instant getCompletedAt() { return completedAt; }
}
