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

    private static String resolveKey(String key) {
        if (!key.isBlank()) {
            return key;
        }
        var attrs = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
        if (attrs != null) {
            HttpServletRequest request = attrs.getRequest();
            return request.getMethod() + ":" + request.getRequestURI();
        }
        return "default";
    }
}
