package com.opas.service;

import org.springframework.data.redis.core.ScanOptions;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;

@Service
public class RefreshTokenService {

    private static final String KEY_PREFIX = "refresh:";
    private static final Duration DEFAULT_TTL = Duration.ofDays(30);

    private final StringRedisTemplate redis;

    public RefreshTokenService(StringRedisTemplate redis) {
        this.redis = redis;
    }

    public void store(String userId, String tokenHash, Duration ttl) {
        redis.opsForValue().set(KEY_PREFIX + userId + ":" + tokenHash, "1",
                ttl != null ? ttl : DEFAULT_TTL);
    }

    public void store(String userId, String tokenHash) {
        store(userId, tokenHash, null);
    }

    public boolean isValid(String userId, String tokenHash) {
        return Boolean.TRUE.equals(redis.hasKey(KEY_PREFIX + userId + ":" + tokenHash));
    }

    public void delete(String userId, String tokenHash) {
        redis.delete(KEY_PREFIX + userId + ":" + tokenHash);
    }

    /**
     * Atomically check-and-consume a refresh token in one round-trip. Redis DELETE
     * returns whether the key existed, so this is race-free: if two requests race to
     * consume the same token, only one of them gets {@code true}. Use this instead of
     * isValid() + delete(), which is a check-then-act race under concurrent refresh
     * calls (e.g. a mobile client retrying a 401 from multiple in-flight requests).
     */
    public boolean consume(String userId, String tokenHash) {
        Boolean deleted = redis.delete(KEY_PREFIX + userId + ":" + tokenHash);
        return Boolean.TRUE.equals(deleted);
    }

    public void invalidateAll(String userId) {
        ScanOptions options = ScanOptions.scanOptions()
        .match(KEY_PREFIX +userId + ":*")
        .count(100)
        .build();
        try (var iterable = redis.scan(options)) {
            iterable.forEachRemaining(key -> redis.delete(key));
        }
    }
}
