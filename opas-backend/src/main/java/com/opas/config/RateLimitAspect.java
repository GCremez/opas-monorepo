package com.opas.config;

import com.opas.service.RateLimiter;
import jakarta.servlet.http.HttpServletRequest;
import java.time.Duration;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

@Aspect
@Component
public class RateLimitAspect {

    private final RateLimiter rateLimiter;

    public RateLimitAspect(RateLimiter rateLimiter) {
        this.rateLimiter = rateLimiter;
    }

    @Around("@annotation(rateLimit)")
    public Object enforceRateLimit(ProceedingJoinPoint joinPoint, RateLimit rateLimit) throws Throwable {
        String key = resolveKey(rateLimit.key());
        if (!rateLimiter.tryAcquire(key, rateLimit.limit(), Duration.ofSeconds(rateLimit.windowSeconds()))) {
            throw new RateLimitExceededException();
        }
        return joinPoint.proceed();
    }

    /**
     * Build the bucket key as {@code <name>:<client-ip>} so the limit is per-caller,
     * not a single global bucket shared by every user (which would be both a DoS —
     * one attacker locks out everyone — and useless for brute-force throttling).
     */
    private static String resolveKey(String name) {
        String scope = name.isBlank() ? defaultScope() : name;
        return scope + ":" + clientIp();
    }

    private static String defaultScope() {
        var attrs = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
        if (attrs != null) {
            HttpServletRequest request = attrs.getRequest();
            return request.getMethod() + ":" + request.getRequestURI();
        }
        return "default";
    }

    private static String clientIp() {
        var attrs = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
        if (attrs == null) {
            return "unknown";
        }
        HttpServletRequest request = attrs.getRequest();
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            // First hop is the original client; only trustworthy behind a known proxy.
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
