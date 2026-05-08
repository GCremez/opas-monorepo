package com.opas.service;

import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.temporal.TemporalAdjusters;

@Service
public class UsageTracker {

    private static final String KEY_PREFIX = "usage:";

    private final StringRedisTemplate redis;

    public UsageTracker(StringRedisTemplate redis) {
        this.redis = redis;
    }

    public long increment(String userId, String action) {
        String key = buildKey(userId, action);
        Long count = redis.opsForValue().increment(key);
        if (count != null && count == 1) {
            redis.expire(key, ttlUntilEndOfMonth());
        }
        return count != null ? count : 0;
    }

    public long getCount(String userId, String action) {
        String value = redis.opsForValue().get(buildKey(userId, action));
        return value != null ? Long.parseLong(value) : 0;
    }

    public long getRemaining(String userId, String action, int limit) {
        return Math.max(0, limit - getCount(userId, action));
    }

    private static String buildKey(String userId, String action) {
        String month = LocalDate.now().format(java.time.format.DateTimeFormatter.ofPattern("yyyy-MM"));
        return KEY_PREFIX + userId + ":" + action + ":" + month;
    }

    private static Duration ttlUntilEndOfMonth() {
        LocalDate now = LocalDate.now();
        LocalDate lastDay = now.with(TemporalAdjusters.lastDayOfMonth());
        long seconds = now.atStartOfDay(ZoneOffset.UTC)
                .with(TemporalAdjusters.lastDayOfMonth())
                .plusDays(1)
                .toEpochSecond() - Instant.now().getEpochSecond();
        return Duration.ofSeconds(Math.max(seconds, 1));
    }
}
