package com.opas.dto;

import org.springframework.lang.Nullable;

public class AuthResponse {
    private String accessToken;
    private String refreshToken;
    private String tokenType = "Bearer";
    private String plan = "free";

    public AuthResponse() {
    }

    public AuthResponse(String accessToken, String refreshToken, String plan) {
        this.accessToken = accessToken;
        this.refreshToken = refreshToken;
        this.plan = plan;
    }

    @Nullable
    public String getAccessToken() {
        return accessToken;
    }

    public void setAccessToken(String accessToken) {
        this.accessToken = accessToken;
    }

    @Nullable
    public String getRefreshToken() {
        return refreshToken;
    }

    public void setRefreshToken(String refreshToken) {
        this.refreshToken = refreshToken;
    }

    public String getTokenType() {
        return tokenType;
    }

    public String getPlan() {
        return plan;
    }

    public void setPlan(String plan) {
        this.plan = plan;
    }
}
