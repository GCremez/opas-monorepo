package com.opas.service;

import java.time.Duration;
import java.time.Instant;
import java.util.Collections;
import java.util.UUID;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.stereotype.Service;

@Service
public class RateLimiter {

    private static final String KEY_PREFIX = "rate_limit:";

    // Sliding-window limiter in a single atomic Lua script. The old version ran
    // remove -> count -> check -> add as four separate round-trips, so a concurrent
    // burst could all pass the check before any request was recorded and sail past
    // the limit. Doing the whole check-and-record in one server-side script closes
    // that race (mirrors the pattern already used in UsageTracker).
    private static final String ACQUIRE_SCRIPT = """
            local key = KEYS[1]
            local now = tonumber(ARGV[1])
            local window = tonumber(ARGV[2])
            local limit = tonumber(ARGV[3])
            local member = ARGV[4]
            redis.call('ZREMRANGEBYSCORE', key, 0, now - window)
            local count = redis.call('ZCARD', key)
            if count >= limit then
                return 0
            end
            redis.call('ZADD', key, now, member)
            redis.call('PEXPIRE', key, window)
            return 1
            """;

    private final StringRedisTemplate redis;
    private final DefaultRedisScript<Long> acquireScript;

    public RateLimiter(StringRedisTemplate redis) {
        this.redis = redis;
        this.acquireScript = new DefaultRedisScript<>(ACQUIRE_SCRIPT, Long.class);
    }

    public boolean tryAcquire(String key, int limit, Duration window) {
        String redisKey = KEY_PREFIX + key;
        long now = Instant.now().toEpochMilli();
        // A unique member per request: two hits in the same millisecond must count as
        // two, not collapse into one ZSET entry keyed by the timestamp alone.
        String member = now + "-" + UUID.randomUUID();
        Long allowed = redis.execute(acquireScript, Collections.singletonList(redisKey),
                String.valueOf(now), String.valueOf(window.toMillis()), String.valueOf(limit), member);
        return allowed != null && allowed == 1L;
    }
}
