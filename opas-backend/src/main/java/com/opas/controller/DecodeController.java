package com.opas.controller;

import com.opas.dto.DecodeRequest;
import com.opas.dto.DecodeResponse;
import com.opas.service.DecodeService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/documents/{documentId}/decode")
public class DecodeController {

    private final DecodeService decodeService;

    public DecodeController(DecodeService decodeService) {
        this.decodeService = decodeService;
    }

    @PostMapping
    public ResponseEntity<DecodeResponse> decode(
            Authentication authentication,
            @PathVariable UUID documentId,
            @Valid @RequestBody DecodeRequest request) {
        UUID userId = UUID.fromString(authentication.getName());
        return ResponseEntity.ok(decodeService.decode(userId, documentId, request));
    }
}
