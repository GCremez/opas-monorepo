package com.opas.service;

import com.opas.domain.Folder;
import com.opas.domain.User;
import com.opas.dto.FolderRequest;
import com.opas.dto.FolderResponse;
import com.opas.repository.DocumentRepository;
import com.opas.repository.FolderRepository;
import com.opas.repository.UserRepository;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class FolderService {

    private final FolderRepository folderRepository;
    private final UserRepository userRepository;
    private final DocumentRepository documentRepository;

    public FolderService(FolderRepository folderRepository, UserRepository userRepository,
            DocumentRepository documentRepository) {
        this.folderRepository = folderRepository;
        this.userRepository = userRepository;
        this.documentRepository = documentRepository;
    }

    @Transactional
    public FolderResponse create(UUID userId, FolderRequest request) {
        User user = userRepository.getReferenceById(userId);
        Folder folder = new Folder();
        folder.setUser(user);
        folder.setName(request.name());
        folder.setDescription(request.description());
        folder = folderRepository.save(folder);
        return FolderResponse.from(folder, 0);
    }

    @Transactional(readOnly = true)
    public List<FolderResponse> list(UUID userId) {
        List<Folder> folders = folderRepository.findByUserIdOrderByCreatedAtDesc(userId);
        return folders.stream()
                .map(f -> FolderResponse.from(f, documentRepository.countByUserId(userId)))
                .toList();
    }

    @Transactional(readOnly = true)
    public FolderResponse get(UUID userId, UUID folderId) {
        Folder folder = folderRepository.findById(folderId)
                .orElseThrow(() -> new IllegalArgumentException("Folder not found"));
        if (!folder.getUser().getId().equals(userId)) {
            throw new IllegalArgumentException("Folder does not belong to user");
        }
        long docCount = documentRepository.countByUserId(userId);
        return FolderResponse.from(folder, docCount);
    }

    @Transactional
    public void delete(UUID userId, UUID folderId) {
        Folder folder = folderRepository.findById(folderId)
                .orElseThrow(() -> new IllegalArgumentException("Folder not found"));
        if (!folder.getUser().getId().equals(userId)) {
            throw new IllegalArgumentException("Folder does not belong to user");
        }
        folderRepository.delete(folder);
    }

    @Transactional
    public FolderResponse update(UUID userId, UUID folderId, FolderRequest request) {
        Folder folder = folderRepository.findById(folderId)
                .orElseThrow(() -> new IllegalArgumentException("Folder not found"));
        if (!folder.getUser().getId().equals(userId)) {
            throw new IllegalArgumentException("Folder does not belong to user");
        }
        folder.setName(request.name());
        folder.setDescription(request.description());
        folder = folderRepository.save(folder);
        long docCount = documentRepository.countByUserId(userId);
        return FolderResponse.from(folder, docCount);
    }
}
