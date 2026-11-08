package com.opas.domain;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "users")
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    @Column(nullable = false)
    private String name;

    @Column(name = "email_verified", nullable = false)
    private boolean emailVerified = false;

    // Interface language chosen at signup (en/fi/sv) — drives localized email.
    @Column(nullable = false)
    private String language = "en";

    // When the user agreed to letters being sent to the AI provider; null = not yet.
    @Column(name = "ai_consent_at")
    private Instant aiConsentAt;

    // Which wording of that consent they agreed to (a date); see opas.consent.ai-version.
    @Column(name = "ai_consent_version")
    private String aiConsentVersion;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = Instant.now();
        updatedAt = Instant.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = Instant.now();
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    @JsonIgnore
    public String getPasswordHash() {
        return passwordHash;
    }

    public void setPasswordHash(String passwordHash) {
        this.passwordHash = passwordHash;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public boolean isEmailVerified() {
        return emailVerified;
    }

    public void setEmailVerified(boolean emailVerified) {
        this.emailVerified = emailVerified;
    }

    public Instant getAiConsentAt() {
        return aiConsentAt;
    }

    public void setAiConsentAt(Instant aiConsentAt) {
        this.aiConsentAt = aiConsentAt;
    }

    public String getAiConsentVersion() {
        return aiConsentVersion;
    }

    public void setAiConsentVersion(String aiConsentVersion) {
        this.aiConsentVersion = aiConsentVersion;
    }

    /** True when the user agreed to the given wording or a later one. */
    public boolean hasAiConsent(String requiredVersion) {
        return aiConsentAt != null && aiConsentVersion != null && aiConsentVersion.compareTo(requiredVersion) >= 0;
    }

    public String getLanguage() {
        return language;
    }

    public void setLanguage(String language) {
        this.language = language;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
