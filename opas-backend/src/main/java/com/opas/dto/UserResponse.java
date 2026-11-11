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
    /**
     * True after the person withdrew AI consent, until they agree again. Tells the app to
     * forget a yes it cached on this device rather than send it to the server again.
     */
    private boolean aiConsentWithdrawn;

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
        UserResponse response = new UserResponse(user.getId(), user.getName(), user.getEmail(), plan,
                AiConsentResponse.of(user));
        response.aiConsentWithdrawn = user.hasWithdrawnAiConsent();
        return response;
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

    public boolean isAiConsentWithdrawn() {
        return aiConsentWithdrawn;
    }
}
