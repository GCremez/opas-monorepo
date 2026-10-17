package com.opas.service;

import com.opas.config.ResourceNotFoundException;
import com.opas.domain.CompletedTask;
import com.opas.domain.DecodeResult;
import com.opas.domain.Document;
import com.opas.domain.User;
import com.opas.dto.CompletedTaskResponse;
import com.opas.dto.ConfirmUploadRequest;
import com.opas.dto.DocumentResponse;
import com.opas.dto.UploadUrlRequest;
import com.opas.repository.CompletedTaskRepository;
import com.opas.repository.DecodeResultRepository;
import com.opas.repository.DocumentRepository;
import com.opas.repository.FolderRepository;
import com.opas.repository.UserRepository;
import java.time.Duration;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.lang.Nullable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class DocumentService {

    private final DocumentRepository documentRepository;
    private final UserRepository userRepository;
    private final FolderRepository folderRepository;
    private final DecodeResultRepository decodeResultRepository;
    private final CompletedTaskRepository completedTaskRepository;
    private final StorageService storageService;
    private final DocumentInsights documentInsights;
    private final Duration uploadTtl;

    public DocumentService(DocumentRepository documentRepository, UserRepository userRepository,
            FolderRepository folderRepository, DecodeResultRepository decodeResultRepository,
            CompletedTaskRepository completedTaskRepository, StorageService storageService,
            DocumentInsights documentInsights,
            @Value("${opas.s3.upload-ttl-minutes}") int uploadTtlMinutes) {
        this.documentRepository = documentRepository;
        this.userRepository = userRepository;
        this.folderRepository = folderRepository;
        this.decodeResultRepository = decodeResultRepository;
        this.completedTaskRepository = completedTaskRepository;
        this.storageService = storageService;
        this.documentInsights = documentInsights;
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
        // A choice the user made (including moving it out of every folder) is final: the
        // AI's suggested category won't be applied over it.
        document.setFolderSetByUser(true);
        document = documentRepository.save(document);
        return toResponse(document, null, generateDownloadUrl(document), insightsFor(document.getId()),
                completedFor(document.getId()));
    }

    /**
     * Mark one of a document's deadlines or actions done, or undo that. Idempotent: marking a
     * task done twice keeps the first completion time.
     */
    @Transactional
    public DocumentResponse setTaskDone(UUID userId, UUID documentId, String taskKey, boolean done) {
        Document document = documentRepository.findById(documentId).orElseThrow(ResourceNotFoundException::new);
        if (!document.getUser().getId().equals(userId)) {
            throw new ResourceNotFoundException();
        }
        var existing = completedTaskRepository.findByDocumentIdAndTaskKey(documentId, taskKey);
        if (done && existing.isEmpty()) {
            CompletedTask task = new CompletedTask();
            task.setDocumentId(documentId);
            task.setTaskKey(taskKey);
            completedTaskRepository.save(task);
        } else if (!done) {
            existing.ifPresent(completedTaskRepository::delete);
        }
        return toResponse(document, null, generateDownloadUrl(document), insightsFor(documentId),
                completedFor(documentId));
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
        document.setFileSize(request.fileSize());
        document.setStatus("pending");
        document = documentRepository.save(document);

        String uploadUrl = storageService.generatePresignedUploadUrl(s3Key, request.contentType(),
                request.fileSize(), uploadTtl);
        return toResponse(document, uploadUrl, null, DocumentInsights.Insights.EMPTY, List.of());
    }

    @Transactional
    public void confirmUpload(UUID userId, UUID documentId, ConfirmUploadRequest request) {
        Document document = documentRepository.findById(documentId)
                .orElseThrow(ResourceNotFoundException::new);
        if (!document.getUser().getId().equals(userId)) {
            throw new ResourceNotFoundException();
        }
        // HEAD the S3 object to verify what the client actually uploaded matches what
        // was declared at upload-url time. The presigned URL bakes in contentLength,
        // so S3 itself already rejected oversized PUTs — but we still verify the
        // stored content-type, because the client could have uploaded via a different
        // method or the presigned URL content-type header might not have been enforced
        // by an S3-compatible backend.
        var head = storageService.headObject(document.getS3Key());
        if (head == null) {
            throw new IllegalArgumentException(
                    "Upload not found: the S3 object does not exist. Did the client upload?");
        }
        // Verify content-type matches what was declared at upload-url time.
        String actualContentType = head.contentType();
        if (actualContentType != null && !actualContentType.equals(document.getContentType())) {
            throw new IllegalArgumentException("Content type mismatch: S3 object is "
                    + actualContentType + " but document was created with " + document.getContentType());
        }
        // Verify file size matches the declared size (the presigned URL should have
        // enforced this, but S3-compatible backends may not).
        Long actualSize = head.contentLength();
        if (actualSize != null && document.getFileSize() != null
                && actualSize.longValue() != document.getFileSize().longValue()) {
            throw new IllegalArgumentException("File size mismatch: S3 object is "
                    + actualSize + " bytes but declared size was " + document.getFileSize());
        }
        document.setStatus("uploaded");
        documentRepository.save(document);
    }

    @Transactional(readOnly = true)
    public List<DocumentResponse> listDocuments(UUID userId) {
        // One query for all of the user's decodes (newest first), not one per document.
        Map<UUID, String> latestDecode = new HashMap<>();
        for (DecodeResult result : decodeResultRepository.findByUserIdOrderByCreatedAtDesc(userId)) {
            latestDecode.putIfAbsent(result.getDocument().getId(), result.getStructuredData());
        }
        List<Document> documents = documentRepository.findByUserIdAndStatusNotOrderByCreatedAtDesc(userId, "archived");
        Map<UUID, List<CompletedTaskResponse>> completed = completedTaskRepository
                .findByDocumentIdIn(documents.stream().map(Document::getId).toList()).stream()
                .collect(Collectors.groupingBy(CompletedTask::getDocumentId,
                        Collectors.mapping(DocumentService::toTaskResponse, Collectors.toList())));
        return documents.stream()
                .map(doc -> toResponse(doc, null, generateDownloadUrl(doc),
                        documentInsights.from(latestDecode.get(doc.getId())),
                        completed.getOrDefault(doc.getId(), List.of())))
                .toList();
    }

    @Transactional(readOnly = true)
    public DocumentResponse getDocument(UUID userId, UUID documentId) {
        Document document = documentRepository.findById(documentId)
                .orElseThrow(ResourceNotFoundException::new);
        if (!document.getUser().getId().equals(userId)) {
            throw new ResourceNotFoundException();
        }
        return toResponse(document, null, generateDownloadUrl(document), insightsFor(documentId),
                completedFor(documentId));
    }

    @Transactional
    public void deleteDocument(UUID userId, UUID documentId) {
        Document document = documentRepository.findById(documentId)
                .orElseThrow(ResourceNotFoundException::new);
        if (!document.getUser().getId().equals(userId)) {
            throw new ResourceNotFoundException();
        }
        // decode_results.document_id has no ON DELETE cascade, so its rows must be
        // removed before the document itself, otherwise the FK check fails.
        // (draft_letters cascade on document delete and need no explicit cleanup.)
        decodeResultRepository.deleteByDocumentId(documentId);
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

    private DocumentInsights.Insights insightsFor(UUID documentId) {
        return decodeResultRepository.findByDocumentId(documentId).stream()
                .max(Comparator.comparing(DecodeResult::getCreatedAt))
                .map(result -> documentInsights.from(result.getStructuredData()))
                .orElse(DocumentInsights.Insights.EMPTY);
    }

    private List<CompletedTaskResponse> completedFor(UUID documentId) {
        return completedTaskRepository.findByDocumentId(documentId).stream().map(DocumentService::toTaskResponse).toList();
    }

    private static CompletedTaskResponse toTaskResponse(CompletedTask task) {
        return new CompletedTaskResponse(task.getTaskKey(), task.getCompletedAt());
    }

    private static DocumentResponse toResponse(Document doc, String uploadUrl, String downloadUrl,
            DocumentInsights.Insights insights, List<CompletedTaskResponse> completedTasks) {
        return new DocumentResponse(doc.getId(), doc.getFilename(), doc.getContentType(), doc.getFileSize(),
                doc.getStatus(), doc.getFolderId(), doc.getCreatedAt(), doc.getUpdatedAt(), uploadUrl, downloadUrl,
                insights.title(), insights.authority(), insights.deadlines(), insights.documentType(),
                insights.summary(), insights.actions(), insights.keyFigure(), completedTasks);
    }
}
