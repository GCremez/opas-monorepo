package com.opas.service;

import java.time.Duration;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

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
        return Boolean.TRUE.equals(redis.opsForValue().setIfAbsent(KEY_PREFIX + idempotencyKey, "1", ttl));
    }

    /**
     * Release a claim taken with {@link #markProcessed}. Used when the handler fails
     * after claiming the key, so Stripe's retry can re-deliver and be processed again
     * instead of being silently swallowed as "already done".
     */
    public void release(String idempotencyKey) {
        redis.delete(KEY_PREFIX + idempotencyKey);
    }
}
