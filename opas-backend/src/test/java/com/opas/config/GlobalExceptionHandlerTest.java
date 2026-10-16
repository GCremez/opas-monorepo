package com.opas.config;

import static org.junit.jupiter.api.Assertions.*;

import java.net.URI;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.validation.BeanPropertyBindingResult;
import org.springframework.web.bind.MethodArgumentNotValidException;

class GlobalExceptionHandlerTest {

    private GlobalExceptionHandler handler;

    @BeforeEach
    void setUp() {
        handler = new GlobalExceptionHandler();
    }

    @Test
    void handlesIllegalArgumentException() {
        var ex = new IllegalArgumentException("Invalid input");

        ProblemDetail detail = handler.handleBadRequest(ex);

        assertEquals(HttpStatus.BAD_REQUEST.value(), detail.getStatus());
        assertEquals("Bad Request", detail.getTitle());
        assertEquals("Invalid input", detail.getDetail());
        assertEquals(URI.create("about:blank"), detail.getType());
    }

    @Test
    void handlesRateLimitExceeded() {
        var ex = new RateLimitExceededException();

        ProblemDetail detail = handler.handleRateLimit(ex);

        assertEquals(HttpStatus.TOO_MANY_REQUESTS.value(), detail.getStatus());
        assertEquals("Too Many Requests", detail.getTitle());
        assertEquals("Too many requests", detail.getDetail());
    }

    @Test
    void handlesValidationError() throws Exception {
        var target = new ValidationTarget();
        var bindingResult = new BeanPropertyBindingResult(target, "target");
        bindingResult.rejectValue("email", "NotBlank", "must not be blank");
        var ex = new MethodArgumentNotValidException(null, bindingResult);

        ProblemDetail detail = handler.handleValidationError(ex);

        assertEquals(HttpStatus.BAD_REQUEST.value(), detail.getStatus());
        assertEquals("Validation Failed", detail.getTitle());
        assertNotNull(detail.getProperties().get("errors"));
        var errors = (java.util.List<?>) detail.getProperties().get("errors");
        assertEquals(1, errors.size());
        var error = (Map<?, ?>) errors.getFirst();
        assertEquals("email", error.get("field"));
    }

    @Test
    void handlesInternalError() {
        var ex = new RuntimeException("Unexpected crash");

        ProblemDetail detail = handler.handleInternal(ex);

        assertEquals(HttpStatus.INTERNAL_SERVER_ERROR.value(), detail.getStatus());
        assertEquals("Internal Server Error", detail.getTitle());
    }

    @SuppressWarnings("unused")
    private static class ValidationTarget {
        private String email;

        public String getEmail() {
            return email;
        }

        public void setEmail(String email) {
            this.email = email;
        }
    }
}
