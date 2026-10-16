package com.opas.controller;

import com.opas.dto.FolderRequest;
import com.opas.dto.FolderResponse;
import com.opas.service.FolderService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/folders")
public class FolderController {

    private final FolderService folderService;

    public FolderController(FolderService folderService) {
        this.folderService = folderService;
    }

    private static UUID resolveUserId(Authentication authentication) {
        String name = authentication.getName();
        if (name == null) {
            throw new IllegalArgumentException("Authentication name must not be null");
        }
        return UUID.fromString(name);
    }

    @PostMapping
    public ResponseEntity<FolderResponse> create(Authentication authentication,
            @Valid @RequestBody FolderRequest request) {
        UUID userId = resolveUserId(authentication);
        return ResponseEntity.status(HttpStatus.CREATED).body(folderService.create(userId, request));
    }

    @GetMapping
    public ResponseEntity<List<FolderResponse>> list(Authentication authentication) {
        UUID userId = resolveUserId(authentication);
        return ResponseEntity.ok(folderService.list(userId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<FolderResponse> get(Authentication authentication, @PathVariable UUID id) {
        UUID userId = resolveUserId(authentication);
        return ResponseEntity.ok(folderService.get(userId, id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<FolderResponse> update(Authentication authentication, @PathVariable UUID id,
            @Valid @RequestBody FolderRequest request) {
        UUID userId = resolveUserId(authentication);
        return ResponseEntity.ok(folderService.update(userId, id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(Authentication authentication, @PathVariable UUID id) {
        UUID userId = resolveUserId(authentication);
        folderService.delete(userId, id);
        return ResponseEntity.noContent().build();
    }
}
