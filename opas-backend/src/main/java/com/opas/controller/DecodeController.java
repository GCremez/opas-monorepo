package com.opas.controller;

import com.opas.config.RabbitMQConfig;
import com.opas.config.RateLimit;
import com.opas.dto.DecodeMessage;
import com.opas.dto.DecodeRequest;
import com.opas.dto.DecodeResponse;
import com.opas.service.DecodeService;
import jakarta.validation.Valid;
import java.util.Map;
import java.util.UUID;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
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
@RequestMapping("/api/v1/documents/{documentId}/decode")
public class DecodeController {

    private final DecodeService decodeService;
    private final RabbitTemplate rabbitTemplate;

    public DecodeController(DecodeService decodeService, RabbitTemplate rabbitTemplate) {
        this.decodeService = decodeService;
        this.rabbitTemplate = rabbitTemplate;
    }

    @RateLimit(key = "decode", limit = 20, windowSeconds = 60)
    @PostMapping
    public ResponseEntity<Map<String, Object>> decode(Authentication authentication, @PathVariable UUID documentId,
            @Valid @RequestBody DecodeRequest request) {
        String name = authentication.getName();
        if (name == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        UUID userId = UUID.fromString(name);

        DecodeMessage message = decodeService.validateAndReserve(userId, documentId, request.scrubPii());
        rabbitTemplate.convertAndSend(RabbitMQConfig.EXCHANGE_DECODE, RabbitMQConfig.ROUTING_KEY_DECODE, message);

        return ResponseEntity.accepted().body(Map.of(
                "documentId", documentId,
                "status", "queued",
                "message", "Decode accepted and queued for processing"));
    }

    @GetMapping
    public ResponseEntity<DecodeResponse> getResult(Authentication authentication, @PathVariable UUID documentId) {
        String name = authentication.getName();
        if (name == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        DecodeResponse result = decodeService.getResult(UUID.fromString(name), documentId);
        // 404 while the background worker is still running; the client polls until 200.
        if (result == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(result);
    }
}
