package com.opas.dto;

import com.opas.domain.User;
import java.util.UUID;

public class UserResponse {
    private UUID id;
    private String name;
    private String email;
    private String plan;

    public UserResponse() {
    }

    public UserResponse(UUID id, String name, String email, String plan) {
        this.id = id;
        this.name = name;
        this.email = email;
        this.plan = plan;
    }

    public static UserResponse from(User user, String plan) {
        return new UserResponse(user.getId(), user.getName(), user.getEmail(), plan);
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
}