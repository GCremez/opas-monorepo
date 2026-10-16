package com.opas.controller;

import com.opas.dto.DraftLetterRequest;
import com.opas.dto.DraftLetterResponse;
import com.opas.service.DraftLetterService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/documents/{documentId}/draft-letter")
public class DraftLetterController {

    private final DraftLetterService draftLetterService;

    public DraftLetterController(DraftLetterService draftLetterService) {
        this.draftLetterService = draftLetterService;
    }

    @GetMapping
    public ResponseEntity<List<DraftLetterResponse>> list(Authentication authentication,
            @PathVariable UUID documentId) {
        String name = authentication.getName();
        if (name == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        return ResponseEntity.ok(draftLetterService.listDraftLetters(UUID.fromString(name), documentId));
    }

    @PostMapping
    public ResponseEntity<DraftLetterResponse> generate(Authentication authentication,
            @PathVariable UUID documentId, @Valid @RequestBody DraftLetterRequest request) {
        String name = authentication.getName();
        if (name == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        return ResponseEntity.ok(draftLetterService.generateDraft(UUID.fromString(name), documentId, request));
    }
}
