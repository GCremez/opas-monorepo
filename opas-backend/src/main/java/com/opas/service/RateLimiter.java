package com.opas.service;

import java.time.Duration;
import java.time.Instant;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

@Service
public class RateLimiter {

    private static final String KEY_PREFIX = "rate_limit:";

    private final StringRedisTemplate redis;

    public RateLimiter(StringRedisTemplate redis) {
        this.redis = redis;
    }

    public boolean tryAcquire(String key, int limit, Duration window) {
        String redisKey = KEY_PREFIX + key;
        long now = Instant.now().toEpochMilli();
        long windowStart = now - window.toMillis();

        redis.opsForZSet().removeRangeByScore(redisKey, 0, windowStart);

        Long count = redis.opsForZSet().count(redisKey, windowStart, Long.MAX_VALUE);
        if (count != null && count >= limit) {
            return false;
        }

        redis.opsForZSet().add(redisKey, String.valueOf(now), now);
        redis.expire(redisKey, window);
        return true;
    }
}
