package com.opas.config;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.opas.service.RateLimiter;
import java.time.Duration;
import org.aspectj.lang.ProceedingJoinPoint;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class RateLimitAspectTest {

    @Mock
    private RateLimiter rateLimiter;
    @Mock
    private ProceedingJoinPoint joinPoint;
    @Mock
    private RateLimit rateLimit;

    @InjectMocks
    private RateLimitAspect aspect;

    @Test
    void allowsRequestWhenUnderLimit() throws Throwable {
        when(rateLimit.key()).thenReturn("test-key");
        when(rateLimit.limit()).thenReturn(10);
        when(rateLimit.windowSeconds()).thenReturn(60L);
        // Key is now "<name>:<client-ip>"; no servlet request in a unit test → "…:unknown".
        when(rateLimiter.tryAcquire(eq("test-key:unknown"), eq(10), eq(Duration.ofSeconds(60)))).thenReturn(true);
        when(joinPoint.proceed()).thenReturn("result");

        aspect.enforceRateLimit(joinPoint, rateLimit);

        verify(joinPoint).proceed();
    }

    @Test
    void throwsWhenRateLimited() throws Throwable {
        when(rateLimit.key()).thenReturn("test-key");
        when(rateLimit.limit()).thenReturn(10);
        when(rateLimit.windowSeconds()).thenReturn(60L);
        when(rateLimiter.tryAcquire(eq("test-key:unknown"), eq(10), eq(Duration.ofSeconds(60)))).thenReturn(false);

        assertThrows(RateLimitExceededException.class, () -> aspect.enforceRateLimit(joinPoint, rateLimit));

        verify(joinPoint, never()).proceed();
    }

    @Test
    void resolvesKeyFromRequestWhenBlank() throws Throwable {
        when(rateLimit.key()).thenReturn("");
        when(rateLimit.limit()).thenReturn(5);
        when(rateLimit.windowSeconds()).thenReturn(30L);
        when(rateLimiter.tryAcquire(anyString(), eq(5), eq(Duration.ofSeconds(30)))).thenReturn(true);
        when(joinPoint.proceed()).thenReturn("result");

        aspect.enforceRateLimit(joinPoint, rateLimit);

        verify(joinPoint).proceed();
    }
}
