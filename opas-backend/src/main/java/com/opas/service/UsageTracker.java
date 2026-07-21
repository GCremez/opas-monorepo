package com.opas.service;

import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.temporal.TemporalAdjusters;
import java.util.Collections;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.stereotype.Service;

@Service
public class UsageTracker {

    private static final String KEY_PREFIX = "usage:";

    private static final String RESERVE_SCRIPT = """
            local key = KEYS[1]
            local limit = tonumber(ARGV[1])
            local ttl = ARGV[2]
            local current = tonumber(redis.call('GET', key) or '0')
            if current >= limit then
                return -1
            end
            local new_count = redis.call('INCR', key)
            if new_count == 1 then
                redis.call('EXPIRE', key, ttl)
            end
            return limit - new_count
            """;

    private final StringRedisTemplate redis;
    private final DefaultRedisScript<Long> reserveScript;

    public UsageTracker(StringRedisTemplate redis) {
        this.redis = redis;
        this.reserveScript = new DefaultRedisScript<>(RESERVE_SCRIPT, Long.class);
    }

    public long increment(String userId, String action) {
        String key = buildKey(userId, action);
        Long count = redis.opsForValue().increment(key);
        if (count != null && count == 1) {
            redis.expire(key, ttlUntilEndOfMonth());
        }
        return count != null ? count : 0;
    }

    /**
     * Atomically check remaining quota and reserve one unit. Returns remaining after
     * reservation, or -1 if limit reached. This eliminates the check-then-act race
     * condition in the old getRemaining + increment pattern.
     */
    public long tryReserve(String userId, String action, int limit) {
        String key = buildKey(userId, action);
        long ttlSeconds = ttlUntilEndOfMonth().getSeconds();
        Long result = redis.execute(reserveScript, Collections.singletonList(key),
                String.valueOf(limit), String.valueOf(ttlSeconds));
        return result != null ? result : -1;
    }

    public long getCount(String userId, String action) {
        String value = redis.opsForValue().get(buildKey(userId, action));
        return value != null ? Long.parseLong(value) : 0;
    }

    public long getRemaining(String userId, String action, int limit) {
        return Math.max(0, limit - getCount(userId, action));
    }

    private static String buildKey(String userId, String action) {
        String month = Instant.now().atZone(ZoneOffset.UTC)
                .format(java.time.format.DateTimeFormatter.ofPattern("yyyy-MM"));
        return KEY_PREFIX + userId + ":" + action + ":" + month;
    }

    private static Duration ttlUntilEndOfMonth() {
        Instant now = Instant.now();
        long endOfMonthSeconds = now.atZone(ZoneOffset.UTC).with(TemporalAdjusters.lastDayOfMonth()).plusDays(1)
                .truncatedTo(java.time.temporal.ChronoUnit.DAYS).toEpochSecond();
        return Duration.ofSeconds(Math.max(endOfMonthSeconds - now.getEpochSecond(), 1));
    }
}
