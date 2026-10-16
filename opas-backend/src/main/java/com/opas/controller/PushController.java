package com.opas.controller;

import com.opas.dto.PushTokenRequest;
import com.opas.service.PushService;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/push")
public class PushController {

    private final PushService pushService;

    public PushController(PushService pushService) {
        this.pushService = pushService;
    }

    @PostMapping("/register")
    public ResponseEntity<Void> register(Authentication authentication,
            @Valid @RequestBody PushTokenRequest request) {
        String name = authentication.getName();
        if (name == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        pushService.register(UUID.fromString(name), request);
        return ResponseEntity.ok().build();
    }
}
