package com.opas.repository;

import com.opas.domain.Folder;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface FolderRepository extends JpaRepository<Folder, UUID> {
    List<Folder> findByUserIdOrderByCreatedAtDesc(UUID userId);

    long countByUserId(UUID userId);

    void deleteByUser_Id(UUID userId);
}
