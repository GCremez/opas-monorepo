package com.opas.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
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
class UsageTrackerTest {

    @Mock
    private StringRedisTemplate redis;
    @Mock
    private ValueOperations<String, String> valueOps;

    private UsageTracker tracker;

    @BeforeEach
    void setUp() {
        tracker = new UsageTracker(redis);
    }

    @Test
    void incrementCreatesKeyWithTtlOnFirstCall() {
        when(redis.opsForValue()).thenReturn(valueOps);
        when(valueOps.increment(anyString())).thenReturn(1L);

        long count = tracker.increment("user-1", "decodes");

        assertEquals(1L, count);
        verify(valueOps).increment(anyString());
        verify(redis).expire(anyString(), any(Duration.class));
    }

    @Test
    void incrementReturnsExistingCount() {
        when(redis.opsForValue()).thenReturn(valueOps);
        when(valueOps.increment(anyString())).thenReturn(5L);

        long count = tracker.increment("user-1", "decodes");

        assertEquals(5L, count);
        verify(redis, never()).expire(anyString(), any(Duration.class));
    }

    @Test
    void getCountReturnsZeroWhenNoKey() {
        when(redis.opsForValue()).thenReturn(valueOps);
        when(valueOps.get(anyString())).thenReturn(null);

        long count = tracker.getCount("user-1", "decodes");

        assertEquals(0L, count);
    }

    @Test
    void getCountReturnsStoredValue() {
        when(redis.opsForValue()).thenReturn(valueOps);
        when(valueOps.get(anyString())).thenReturn("3");

        long count = tracker.getCount("user-1", "decodes");

        assertEquals(3L, count);
    }

    @Test
    void getRemainingReturnsDifference() {
        when(redis.opsForValue()).thenReturn(valueOps);
        when(valueOps.get(anyString())).thenReturn("2");

        long remaining = tracker.getRemaining("user-1", "decodes", 5);

        assertEquals(3L, remaining);
    }

    @Test
    void getRemainingReturnsZeroWhenOverLimit() {
        when(redis.opsForValue()).thenReturn(valueOps);
        when(valueOps.get(anyString())).thenReturn("10");

        long remaining = tracker.getRemaining("user-1", "decodes", 5);

        assertEquals(0L, remaining);
    }

    @Test
    void getRemainingReturnsLimitWhenNoUsage() {
        when(redis.opsForValue()).thenReturn(valueOps);
        when(valueOps.get(anyString())).thenReturn(null);

        long remaining = tracker.getRemaining("user-1", "decodes", 5);

        assertEquals(5L, remaining);
    }

    @Test
    void incrementHandlesNullFromRedis() {
        when(redis.opsForValue()).thenReturn(valueOps);
        when(valueOps.increment(anyString())).thenReturn(null);

        long count = tracker.increment("user-1", "decodes");

        assertEquals(0L, count);
    }
}
