package com.opas.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import java.time.Duration;
import java.util.function.Consumer;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.Cursor;
import org.springframework.data.redis.core.ScanOptions;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

@ExtendWith(MockitoExtension.class)
class RefreshTokenServiceTest {

    @Mock
    private StringRedisTemplate redis;
    @Mock
    private ValueOperations<String, String> valueOps;

    private RefreshTokenService service;

    @BeforeEach
    void setUp() {
        service = new RefreshTokenService(redis);
    }

    @Test
    void storeSavesTokenWithDefaultTtl() {
        when(redis.opsForValue()).thenReturn(valueOps);

        service.store("user-1", "token-hash");

        verify(valueOps).set("refresh:user-1:token-hash", "1", Duration.ofDays(30));
    }

    @Test
    void storeSavesTokenWithCustomTtl() {
        when(redis.opsForValue()).thenReturn(valueOps);

        service.store("user-1", "token-hash", Duration.ofHours(1));

        verify(valueOps).set("refresh:user-1:token-hash", "1", Duration.ofHours(1));
    }

    @Test
    void isValidReturnsTrueWhenKeyExists() {
        when(redis.hasKey("refresh:user-1:token-hash")).thenReturn(true);

        assertTrue(service.isValid("user-1", "token-hash"));
    }

    @Test
    void isValidReturnsFalseWhenKeyMissing() {
        when(redis.hasKey("refresh:user-1:token-hash")).thenReturn(false);

        assertFalse(service.isValid("user-1", "token-hash"));
    }

    @Test
    void deleteRemovesKey() {
        service.delete("user-1", "token-hash");

        verify(redis).delete("refresh:user-1:token-hash");
    }

    @Test
    void consumeReturnsTrueWhenKeyExistsAndDeletesIt() {
        when(redis.delete("refresh:user-1:token-hash")).thenReturn(true);

        boolean result = service.consume("user-1", "token-hash");

        assertTrue(result);
        verify(redis).delete("refresh:user-1:token-hash");
    }

    @Test
    void consumeReturnsFalseWhenKeyMissing() {
        when(redis.delete("refresh:user-2:missing-hash")).thenReturn(false);

        boolean result = service.consume("user-2", "missing-hash");

        assertFalse(result);
    }

    @SuppressWarnings("unchecked")
    @Test
    void invalidateAllScansAndDeletes() {
        Cursor<String> cursor = mock(Cursor.class);
        when(redis.scan(any(ScanOptions.class))).thenReturn(cursor);
        doAnswer(invocation -> {
            Consumer<String> action = invocation.getArgument(0);
            action.accept("refresh:user-1:key1");
            action.accept("refresh:user-1:key2");
            return null;
        }).when(cursor).forEachRemaining(any(Consumer.class));

        service.invalidateAll("user-1");

        verify(redis).delete("refresh:user-1:key1");
        verify(redis).delete("refresh:user-1:key2");
    }
}
