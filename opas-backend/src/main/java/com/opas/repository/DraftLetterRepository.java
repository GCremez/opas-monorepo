package com.opas.repository;

import com.opas.domain.DraftLetter;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DraftLetterRepository extends JpaRepository<DraftLetter, UUID> {
    List<DraftLetter> findByDocumentIdOrderByCreatedAtDesc(UUID documentId);
}
