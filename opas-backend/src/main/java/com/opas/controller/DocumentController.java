package com.opas.controller;

import com.opas.dto.DocumentResponse;
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
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/documents")
public class DocumentController {

    private final DocumentService documentService;

    public DocumentController(DocumentService documentService) {
        this.documentService = documentService;
    }

    private static UUID resolveUserId(Authentication authentication) {
        String name = authentication.getName();
        return name != null ? UUID.fromString(name) : null;
    }

    @PostMapping("/upload-url")
    public ResponseEntity<DocumentResponse> requestUploadUrl(Authentication authentication,
            @Valid @RequestBody UploadUrlRequest request) {
        UUID userId = resolveUserId(authentication);
        if (userId == null)
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        return ResponseEntity.status(HttpStatus.CREATED).body(documentService.requestUploadUrl(userId, request));
    }

    @PatchMapping("/{id}/confirm")
    public ResponseEntity<Void> confirmUpload(Authentication authentication, @PathVariable UUID id) {
        UUID userId = resolveUserId(authentication);
        if (userId == null)
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        documentService.confirmUpload(userId, id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping
    public ResponseEntity<List<DocumentResponse>> listDocuments(Authentication authentication) {
        UUID userId = resolveUserId(authentication);
        if (userId == null)
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        return ResponseEntity.ok(documentService.listDocuments(userId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<DocumentResponse> getDocument(Authentication authentication, @PathVariable UUID id) {
        UUID userId = resolveUserId(authentication);
        if (userId == null)
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        return ResponseEntity.ok(documentService.getDocument(userId, id));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteDocument(Authentication authentication, @PathVariable UUID id) {
        UUID userId = resolveUserId(authentication);
        if (userId == null)
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        documentService.deleteDocument(userId, id);
        return ResponseEntity.noContent().build();
    }

}
