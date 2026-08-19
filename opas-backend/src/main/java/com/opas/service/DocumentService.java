package com.opas.service;

import com.opas.config.ResourceNotFoundException;
import com.opas.domain.Document;
import com.opas.domain.User;
import com.opas.dto.DocumentResponse;
import com.opas.dto.UploadUrlRequest;
import com.opas.repository.DocumentRepository;
import com.opas.repository.FolderRepository;
import com.opas.repository.UserRepository;
import java.time.Duration;
import java.util.List;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.lang.Nullable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class DocumentService {

    private final DocumentRepository documentRepository;
    private final UserRepository userRepository;
    private final FolderRepository folderRepository;
    private final StorageService storageService;
    private final Duration uploadTtl;

    public DocumentService(DocumentRepository documentRepository, UserRepository userRepository,
            FolderRepository folderRepository, StorageService storageService,
            @Value("${opas.s3.upload-ttl-minutes}") int uploadTtlMinutes) {
        this.documentRepository = documentRepository;
        this.userRepository = userRepository;
        this.folderRepository = folderRepository;
        this.storageService = storageService;
        this.uploadTtl = Duration.ofMinutes(uploadTtlMinutes);
    }

    /**
     * File a document under a folder, or pass a null folderId to unfile it. Both the
     * document and (when present) the target folder must belong to the caller.
     */
    @Transactional
    public DocumentResponse assignFolder(UUID userId, UUID documentId, @Nullable UUID folderId) {
        Document document = documentRepository.findById(documentId).orElseThrow(ResourceNotFoundException::new);
        if (!document.getUser().getId().equals(userId)) {
            throw new ResourceNotFoundException();
        }
        if (folderId != null) {
            var folder = folderRepository.findById(folderId).orElseThrow(ResourceNotFoundException::new);
            if (!folder.getUser().getId().equals(userId)) {
                throw new ResourceNotFoundException();
            }
        }
        document.setFolderId(folderId);
        document = documentRepository.save(document);
        return toResponse(document, null, generateDownloadUrl(document));
    }

    @Transactional
    public DocumentResponse requestUploadUrl(UUID userId, UploadUrlRequest request) {
        User user = userRepository.getReferenceById(userId);
        String s3Key = userId + "/" + UUID.randomUUID() + "/" + request.filename();

        Document document = new Document();
        document.setUser(user);
        document.setFilename(request.filename());
        document.setContentType(request.contentType());
        document.setS3Key(s3Key);
        document.setStatus("pending");
        document = documentRepository.save(document);

        String uploadUrl = storageService.generatePresignedUploadUrl(s3Key, request.contentType(), uploadTtl);
        return toResponse(document, uploadUrl, null);
    }

    @Transactional
    public void confirmUpload(UUID userId, UUID documentId) {
        Document document = documentRepository.findById(documentId)
                .orElseThrow(ResourceNotFoundException::new);
        if (!document.getUser().getId().equals(userId)) {
            throw new ResourceNotFoundException();
        }
        document.setStatus("uploaded");
        documentRepository.save(document);
    }

    @Transactional(readOnly = true)
    public List<DocumentResponse> listDocuments(UUID userId) {
        return documentRepository.findByUserIdAndStatusNotOrderByCreatedAtDesc(userId, "archived").stream()
                .map(doc -> toResponse(doc, null, generateDownloadUrl(doc))).toList();
    }

    @Transactional(readOnly = true)
    public DocumentResponse getDocument(UUID userId, UUID documentId) {
        Document document = documentRepository.findById(documentId)
                .orElseThrow(ResourceNotFoundException::new);
        if (!document.getUser().getId().equals(userId)) {
            throw new ResourceNotFoundException();
        }
        return toResponse(document, null, generateDownloadUrl(document));
    }

    @Transactional
    public void deleteDocument(UUID userId, UUID documentId) {
        Document document = documentRepository.findById(documentId)
                .orElseThrow(ResourceNotFoundException::new);
        if (!document.getUser().getId().equals(userId)) {
            throw new ResourceNotFoundException();
        }
        storageService.deleteObject(document.getS3Key());
        documentRepository.delete(document);
    }

    @Transactional
    public void archiveDocument(UUID userId, UUID documentId) {
        Document document = documentRepository.findById(documentId)
                .orElseThrow(ResourceNotFoundException::new);
        if (!document.getUser().getId().equals(userId)) {
            throw new ResourceNotFoundException();
        }
        document.setStatus("archived");
        documentRepository.save(document);
    }

    @Nullable
    private String generateDownloadUrl(Document document) {
        if (!"uploaded".equals(document.getStatus()) && !"ready".equals(document.getStatus())) {
            return null;
        }
        if ("archived".equals(document.getStatus())) {
            return null;
        }
        return storageService.generatePresignedDownloadUrl(document.getS3Key(), Duration.ofHours(1));
    }

    private static DocumentResponse toResponse(Document doc, String uploadUrl, String downloadUrl) {
        return new DocumentResponse(doc.getId(), doc.getFilename(), doc.getContentType(), doc.getFileSize(),
                doc.getStatus(), doc.getFolderId(), doc.getCreatedAt(), doc.getUpdatedAt(), uploadUrl, downloadUrl);
    }
}
