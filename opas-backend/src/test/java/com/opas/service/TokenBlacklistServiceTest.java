package com.opas.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import java.time.Duration;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

@ExtendWith(MockitoExtension.class)
class TokenBlacklistServiceTest {

    @Mock
    private StringRedisTemplate redis;
    @Mock
    private ValueOperations<String, String> valueOps;

    private TokenBlacklistService service;

    @BeforeEach
    void setUp() {
        service = new TokenBlacklistService(redis);
    }

    @Test
    void blacklistStoresKeyWithTtl() {
        when(redis.opsForValue()).thenReturn(valueOps);

        service.blacklist("jti-123", Duration.ofHours(1));

        verify(valueOps).set("blacklist:access:jti-123", "1", Duration.ofHours(1));
    }

    @Test
    void isBlacklistedReturnsTrueWhenExists() {
        when(redis.hasKey("blacklist:access:jti-123")).thenReturn(true);

        assertTrue(service.isBlacklisted("jti-123"));
    }

    @Test
    void isBlacklistedReturnsFalseWhenMissing() {
        when(redis.hasKey("blacklist:access:missing")).thenReturn(false);

        assertFalse(service.isBlacklisted("missing"));
    }
}
