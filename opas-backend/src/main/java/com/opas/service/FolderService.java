package com.opas.service;

import com.opas.config.ResourceNotFoundException;
import com.opas.domain.DocumentCategory;
import com.opas.domain.Folder;
import com.opas.domain.User;
import com.opas.dto.FolderRequest;
import com.opas.dto.FolderResponse;
import com.opas.repository.DocumentRepository;
import com.opas.repository.FolderRepository;
import com.opas.repository.UserRepository;
import java.util.Comparator;
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

    /**
     * The user's folders: the built-in categories first, in a fixed order, then their own
     * folders newest first. Built-ins are created on first use, so every account has them.
     */
    @Transactional
    public List<FolderResponse> list(UUID userId) {
        for (DocumentCategory category : DocumentCategory.values()) {
            builtInFolder(userId, category);
        }
        List<Folder> folders = folderRepository.findByUserIdOrderByCreatedAtDesc(userId);
        Comparator<Folder> builtInsFirst = Comparator.comparingInt(f -> f.getCategoryKey() == null
                ? Integer.MAX_VALUE
                : DocumentCategory.fromKey(f.getCategoryKey()).map(Enum::ordinal).orElse(Integer.MAX_VALUE - 1));
        return folders.stream()
                .sorted(builtInsFirst) // stable: custom folders keep their newest-first order
                .map(f -> FolderResponse.from(f, documentRepository.countByFolderId(f.getId())))
                .toList();
    }

    /** The user's folder for a built-in category, created if it doesn't exist yet. */
    @Transactional
    public Folder builtInFolder(UUID userId, DocumentCategory category) {
        return folderRepository.findByUserIdAndCategoryKey(userId, category.key()).orElseGet(() -> {
            Folder folder = new Folder();
            folder.setUser(userRepository.getReferenceById(userId));
            folder.setName(category.defaultName());
            folder.setCategoryKey(category.key());
            return folderRepository.save(folder);
        });
    }

    private static void rejectBuiltIn(Folder folder) {
        if (folder.getCategoryKey() != null) {
            throw new IllegalArgumentException("Built-in categories can't be renamed or deleted");
        }
    }

    @Transactional(readOnly = true)
    public FolderResponse get(UUID userId, UUID folderId) {
        Folder folder = folderRepository.findById(folderId)
                .orElseThrow(ResourceNotFoundException::new);
        if (!folder.getUser().getId().equals(userId)) {
            throw new ResourceNotFoundException();
        }
        long docCount = documentRepository.countByFolderId(folderId);
        return FolderResponse.from(folder, docCount);
    }

    @Transactional
    public void delete(UUID userId, UUID folderId) {
        Folder folder = folderRepository.findById(folderId)
                .orElseThrow(ResourceNotFoundException::new);
        if (!folder.getUser().getId().equals(userId)) {
            throw new ResourceNotFoundException();
        }
        rejectBuiltIn(folder);
        // Unfile any documents in this folder first; documents.folder_id has no
        // cascade, so deleting a non-empty folder would otherwise fail the FK check.
        documentRepository.clearFolder(folderId);
        folderRepository.delete(folder);
    }

    @Transactional
    public FolderResponse update(UUID userId, UUID folderId, FolderRequest request) {
        Folder folder = folderRepository.findById(folderId)
                .orElseThrow(ResourceNotFoundException::new);
        if (!folder.getUser().getId().equals(userId)) {
            throw new ResourceNotFoundException();
        }
        rejectBuiltIn(folder);
        folder.setName(request.name());
        folder.setDescription(request.description());
        folder = folderRepository.save(folder);
        long docCount = documentRepository.countByFolderId(folderId);
        return FolderResponse.from(folder, docCount);
    }
}
