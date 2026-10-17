package com.opas.repository;

import com.opas.domain.CompletedTask;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CompletedTaskRepository extends JpaRepository<CompletedTask, UUID> {
    List<CompletedTask> findByDocumentId(UUID documentId);

    List<CompletedTask> findByDocumentIdIn(Collection<UUID> documentIds);

    Optional<CompletedTask> findByDocumentIdAndTaskKey(UUID documentId, String taskKey);
}
