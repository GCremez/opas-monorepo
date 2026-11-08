package com.opas.dto;

import com.opas.domain.User;
import java.time.Instant;
import java.util.UUID;

public class UserResponse {
    private UUID id;
    private String name;
    private String email;
    private String plan;
    private Instant aiConsentAt;
    private String aiConsentVersion;

    public UserResponse() {
    }

    public UserResponse(UUID id, String name, String email, String plan, Instant aiConsentAt,
            String aiConsentVersion) {
        this.id = id;
        this.name = name;
        this.email = email;
        this.plan = plan;
        this.aiConsentAt = aiConsentAt;
        this.aiConsentVersion = aiConsentVersion;
    }

    public static UserResponse from(User user, String plan) {
        return new UserResponse(user.getId(), user.getName(), user.getEmail(), plan, user.getAiConsentAt(),
                user.getAiConsentVersion());
    }

    public UUID getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public String getEmail() {
        return email;
    }

    public String getPlan() {
        return plan;
    }

    public Instant getAiConsentAt() {
        return aiConsentAt;
    }

    public String getAiConsentVersion() {
        return aiConsentVersion;
    }
}