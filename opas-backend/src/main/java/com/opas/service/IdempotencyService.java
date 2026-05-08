package com.opas.service;

import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;

@Service
public class IdempotencyService {

    private static final String KEY_PREFIX = "idempotent:";

    private final StringRedisTemplate redis;

    public IdempotencyService(StringRedisTemplate redis) {
        this.redis = redis;
    }

    public boolean isProcessed(String idempotencyKey) {
        return Boolean.TRUE.equals(redis.hasKey(KEY_PREFIX + idempotencyKey));
    }

    public boolean markProcessed(String idempotencyKey, Duration ttl) {
        return Boolean.TRUE.equals(
                redis.opsForValue().setIfAbsent(KEY_PREFIX + idempotencyKey, "1", ttl));
    }
}
