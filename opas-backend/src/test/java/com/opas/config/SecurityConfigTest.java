package com.opas.config;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.opas.service.TokenBlacklistService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * The app refreshes its access token (15 minutes) only when the API answers 401. A missing,
 * expired or invalid token must therefore get 401, not Spring Security's default 403, or
 * every session breaks after 15 minutes instead of refreshing.
 */
@WebMvcTest(controllers = SecurityConfigTest.PingController.class)
@Import({SecurityConfig.class, JwtAuthenticationFilter.class, SecurityConfigTest.PingController.class})
@TestPropertySource(properties = "opas.cors.allowed-origins=http://localhost:3000")
class SecurityConfigTest {

    @RestController
    static class PingController {
        @GetMapping("/api/v1/ping")
        String ping() {
            return "pong";
        }
    }

    @Autowired
    private MockMvc mvc;
    @MockitoBean
    private JwtUtil jwtUtil;
    @MockitoBean
    private TokenBlacklistService tokenBlacklistService;

    @Test
    void noTokenIs401() throws Exception {
        mvc.perform(get("/api/v1/ping")).andExpect(status().isUnauthorized());
    }

    @Test
    void expiredOrInvalidTokenIs401() throws Exception {
        when(jwtUtil.parseToken(anyString())).thenThrow(new io.jsonwebtoken.ExpiredJwtException(null, null, "expired"));
        mvc.perform(get("/api/v1/ping").header("Authorization", "Bearer old-token"))
                .andExpect(status().isUnauthorized());
    }
}
