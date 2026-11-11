package com.opas.dto;

import com.opas.domain.User;
import java.util.UUID;

public class UserResponse {
    private UUID id;
    private String name;
    private String email;
    private String plan;
    /** Null until the person agrees to the AI consent screen. */
    private AiConsentResponse aiConsent;

    public UserResponse() {
    }

    public UserResponse(UUID id, String name, String email, String plan) {
        this(id, name, email, plan, null);
    }

    public UserResponse(UUID id, String name, String email, String plan, AiConsentResponse aiConsent) {
        this.id = id;
        this.name = name;
        this.email = email;
        this.plan = plan;
        this.aiConsent = aiConsent;
    }

    public static UserResponse from(User user, String plan) {
        return new UserResponse(user.getId(), user.getName(), user.getEmail(), plan, AiConsentResponse.of(user));
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

    public AiConsentResponse getAiConsent() {
        return aiConsent;
    }
}