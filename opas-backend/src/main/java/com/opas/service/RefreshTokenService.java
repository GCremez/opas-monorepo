package com.opas.service;

import java.time.Duration;
import org.springframework.data.redis.core.ScanOptions;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

@Service
public class RefreshTokenService {

    private static final String KEY_PREFIX = "refresh:";
    private static final Duration DEFAULT_TTL = Duration.ofDays(30);

    private final StringRedisTemplate redis;

    public RefreshTokenService(StringRedisTemplate redis) {
        this.redis = redis;
    }

    public void store(String userId, String tokenHash, Duration ttl) {
        redis.opsForValue().set(KEY_PREFIX + userId + ":" + tokenHash, "1", ttl != null ? ttl : DEFAULT_TTL);
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

    public boolean consume(String userId, String tokenHash) {
        var key = KEY_PREFIX + userId + ":" + tokenHash;
        Boolean deleted = redis.delete(key);
        return Boolean.TRUE.equals(deleted);
    }

    public void invalidateAll(String userId) {
        var options = ScanOptions.scanOptions().match(KEY_PREFIX + userId + ":*").count(100).build();
        try (var cursor = redis.scan(options)) {
            cursor.forEachRemaining(key -> redis.delete(key));
        }
    }
}
