package com.opas.controller;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.opas.dto.AuthResponse;
import com.opas.dto.LoginRequest;
import com.opas.dto.RefreshRequest;
import com.opas.dto.RegisterRequest;
import com.opas.dto.RegisterResponse;
import com.opas.dto.ResendVerificationRequest;
import com.opas.dto.VerifyEmailRequest;
import com.opas.service.AuthService;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatusCode;
import org.springframework.security.core.Authentication;

@ExtendWith(MockitoExtension.class)
class AuthControllerTest {

    @Mock
    private AuthService authService;
    @Mock
    private Authentication authentication;

    private AuthController controller;

    @BeforeEach
    void setUp() {
        controller = new AuthController(authService);
    }

    @Test
    void registerReturns202RequiringVerification() {
        var request = new RegisterRequest("new@example.com", "password123", "New User");
        when(authService.register(request))
                .thenReturn(RegisterResponse.verificationRequired("new@example.com"));

        var response = controller.register(request);

        assertEquals(202, response.getStatusCode().value());
        assertNotNull(response.getBody());
        assertTrue(response.getBody().verificationRequired());
        assertEquals("new@example.com", response.getBody().email());
    }

    @Test
    void verifyEmailReturns200WithTokens() {
        var request = new VerifyEmailRequest("new@example.com", "123456");
        when(authService.verifyEmail("new@example.com", "123456"))
                .thenReturn(new AuthResponse("at", "rt", "free", null));

        var response = controller.verifyEmail(request);

        assertEquals(200, response.getStatusCode().value());
        assertEquals("at", response.getBody().getAccessToken());
    }

    @Test
    void resendVerificationReturns204() {
        var request = new ResendVerificationRequest("new@example.com");
        doNothing().when(authService).resendVerification("new@example.com");

        var response = controller.resendVerification(request);

        assertEquals(204, response.getStatusCode().value());
    }

    @Test
    void loginReturns200() {
        var request = new LoginRequest("test@example.com", "password123");
        when(authService.login(request)).thenReturn(new AuthResponse("at", "rt", "free", null));

        var response = controller.login(request);

        assertEquals(200, response.getStatusCode().value());
        assertEquals("at", response.getBody().getAccessToken());
    }

    @Test
    void refreshReturns200() {
        var request = new RefreshRequest("refresh-token");
        when(authService.refresh(request)).thenReturn(new AuthResponse("new-at", "new-rt", "premium", null));

        var response = controller.refresh(request);

        assertEquals(200, response.getStatusCode().value());
        assertEquals("premium", response.getBody().getPlan());
    }

    @Test
    void logoutReturns204() {
        var request = new RefreshRequest("rt");
        doNothing().when(authService).logout("Bearer at", "rt");

        var response = controller.logout("Bearer at", request);

        assertEquals(204, response.getStatusCode().value());
    }

    @Test
    void deleteAccountReturns204() {
        UUID userId = UUID.randomUUID();
        when(authentication.getName()).thenReturn(userId.toString());
        doNothing().when(authService).deleteAccount(userId);

        var response = controller.deleteAccount(authentication);

        assertEquals(204, response.getStatusCode().value());
    }

    @Test
    void deleteAccountReturns401WhenNotAuthenticated() {
        when(authentication.getName()).thenReturn(null);

        var response = controller.deleteAccount(authentication);

        assertEquals(401, response.getStatusCode().value());
    }
}
