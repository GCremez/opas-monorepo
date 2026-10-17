package com.opas.controller;

import com.opas.dto.AssignFolderRequest;
import com.opas.dto.ConfirmUploadRequest;
import com.opas.dto.DocumentResponse;
import com.opas.dto.TaskRequest;
import com.opas.dto.UploadUrlRequest;
import com.opas.service.DocumentService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/documents")
public class DocumentController {

    private final DocumentService documentService;
    private final com.opas.service.EmbeddingService embeddingService;

    public DocumentController(DocumentService documentService,
            com.opas.service.EmbeddingService embeddingService) {
        this.documentService = documentService;
        this.embeddingService = embeddingService;
    }

    private static UUID resolveUserId(Authentication authentication) {
        String name = authentication.getName();
        if (name == null) {
            throw new IllegalArgumentException("Authentication name must not be null");
        }
        return UUID.fromString(name);
    }

    @PostMapping("/upload-url")
    public ResponseEntity<DocumentResponse> requestUploadUrl(Authentication authentication,
            @Valid @RequestBody UploadUrlRequest request) {
        UUID userId = resolveUserId(authentication);
        return ResponseEntity.status(HttpStatus.CREATED).body(documentService.requestUploadUrl(userId, request));
    }

    @PatchMapping("/{id}/confirm")
    public ResponseEntity<Void> confirmUpload(Authentication authentication, @PathVariable UUID id,
            @Valid @RequestBody(required = false) ConfirmUploadRequest request) {
        UUID userId = resolveUserId(authentication);
        documentService.confirmUpload(userId, id, request);
        return ResponseEntity.noContent().build();
    }

    @GetMapping
    public ResponseEntity<List<DocumentResponse>> listDocuments(Authentication authentication) {
        UUID userId = resolveUserId(authentication);
        return ResponseEntity.ok(documentService.listDocuments(userId));
    }

    @GetMapping("/search")
    public ResponseEntity<List<com.opas.dto.DocumentSearchResult>> search(Authentication authentication,
            @RequestParam("q") String query,
            @RequestParam(name = "limit", defaultValue = "20") int limit) {
        UUID userId = resolveUserId(authentication);
        if (query == null || query.isBlank()) {
            return ResponseEntity.ok(List.of());
        }
        int bounded = Math.max(1, Math.min(limit, 50));
        return ResponseEntity.ok(embeddingService.searchSimilarWithScore(userId, query, bounded));
    }

    @GetMapping("/{id}")
    public ResponseEntity<DocumentResponse> getDocument(Authentication authentication, @PathVariable UUID id) {
        UUID userId = resolveUserId(authentication);
        return ResponseEntity.ok(documentService.getDocument(userId, id));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteDocument(Authentication authentication, @PathVariable UUID id) {
        UUID userId = resolveUserId(authentication);
        documentService.deleteDocument(userId, id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/archive")
    public ResponseEntity<Void> archiveDocument(Authentication authentication, @PathVariable UUID id) {
        UUID userId = resolveUserId(authentication);
        documentService.archiveDocument(userId, id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/folder")
    public ResponseEntity<DocumentResponse> assignFolder(Authentication authentication, @PathVariable UUID id,
            @RequestBody AssignFolderRequest request) {
        UUID userId = resolveUserId(authentication);
        return ResponseEntity.ok(documentService.assignFolder(userId, id, request.folderId()));
    }

    @PutMapping("/{id}/tasks")
    public ResponseEntity<DocumentResponse> setTaskDone(Authentication authentication, @PathVariable UUID id,
            @Valid @RequestBody TaskRequest request) {
        UUID userId = resolveUserId(authentication);
        return ResponseEntity.ok(documentService.setTaskDone(userId, id, request.key(), request.done()));
    }

}
