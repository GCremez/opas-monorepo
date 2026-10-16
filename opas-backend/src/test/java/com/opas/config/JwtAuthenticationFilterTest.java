package com.opas.config;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.opas.service.TokenBlacklistService;
import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.context.SecurityContextHolder;

@ExtendWith(MockitoExtension.class)
class JwtAuthenticationFilterTest {

    @Mock
    private JwtUtil jwtUtil;
    @Mock
    private TokenBlacklistService tokenBlacklistService;
    @Mock
    private HttpServletRequest request;
    @Mock
    private HttpServletResponse response;
    @Mock
    private FilterChain chain;
    @Mock
    private Claims claims;

    private JwtAuthenticationFilter filter;

    @BeforeEach
    void setUp() {
        filter = new JwtAuthenticationFilter(jwtUtil, tokenBlacklistService);
        SecurityContextHolder.clearContext();
    }

    @Test
    void setsAuthenticationForValidToken() throws Exception {
        when(request.getHeader("Authorization")).thenReturn("Bearer valid-token");
        when(jwtUtil.parseToken("valid-token")).thenReturn(claims);
        when(claims.getId()).thenReturn("jti-123");
        when(claims.getSubject()).thenReturn("user-123");
        when(tokenBlacklistService.isBlacklisted("jti-123")).thenReturn(false);

        filter.doFilterInternal(request, response, chain);

        assertNotNull(SecurityContextHolder.getContext().getAuthentication());
        assertEquals("user-123",
                SecurityContextHolder.getContext().getAuthentication().getPrincipal());
        verify(chain).doFilter(request, response);
    }

    @Test
    void skipsAuthenticationForMissingHeader() throws Exception {
        when(request.getHeader("Authorization")).thenReturn(null);

        filter.doFilterInternal(request, response, chain);

        assertNull(SecurityContextHolder.getContext().getAuthentication());
        verify(chain).doFilter(request, response);
    }

    @Test
    void skipsAuthenticationForNonBearerHeader() throws Exception {
        when(request.getHeader("Authorization")).thenReturn("Basic token");

        filter.doFilterInternal(request, response, chain);

        assert SecurityContextHolder.getContext().getAuthentication() == null;
    }

    @Test
    void skipsAuthenticationWhenTokenIsBlacklisted() throws Exception {
        when(request.getHeader("Authorization")).thenReturn("Bearer blacklisted-token");
        when(jwtUtil.parseToken("blacklisted-token")).thenReturn(claims);
        when(claims.getId()).thenReturn("jti-blacklisted");
        when(claims.getSubject()).thenReturn("user-123");
        when(tokenBlacklistService.isBlacklisted("jti-blacklisted")).thenReturn(true);

        filter.doFilterInternal(request, response, chain);

        assertNull(SecurityContextHolder.getContext().getAuthentication());
    }

    @Test
    void skipsAuthenticationWhenJtiIsNull() throws Exception {
        when(request.getHeader("Authorization")).thenReturn("Bearer no-jti-token");
        when(jwtUtil.parseToken("no-jti-token")).thenReturn(claims);
        when(claims.getId()).thenReturn(null);

        filter.doFilterInternal(request, response, chain);

        assertNull(SecurityContextHolder.getContext().getAuthentication());
    }

    @Test
    void clearsContextOnInvalidToken() throws Exception {
        SecurityContextHolder.getContext().setAuthentication(
                new org.springframework.security.authentication.UsernamePasswordAuthenticationToken("old", null,
                        java.util.Collections.emptyList()));
        when(request.getHeader("Authorization")).thenReturn("Bearer invalid-token");
        when(jwtUtil.parseToken("invalid-token")).thenThrow(new RuntimeException("Bad token"));

        filter.doFilterInternal(request, response, chain);

        assertNull(SecurityContextHolder.getContext().getAuthentication());
        verify(chain).doFilter(request, response);
    }

    @Test
    void handlesEmptyBearerToken() throws Exception {
        when(request.getHeader("Authorization")).thenReturn("Bearer ");

        filter.doFilterInternal(request, response, chain);

        assertNull(SecurityContextHolder.getContext().getAuthentication());
        verify(chain).doFilter(request, response);
    }
}
