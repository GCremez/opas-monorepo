package com.opas.config;

import java.net.URI;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(ResourceNotFoundException.class)
    public ProblemDetail handleNotFound(ResourceNotFoundException e) {
        // Generic body — must be identical whether the resource is absent or the
        // caller simply doesn't own it, so the endpoint can't be used as an oracle.
        ProblemDetail detail = ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND,
                "The requested resource was not found.");
        detail.setType(URI.create("about:blank"));
        detail.setTitle("Not Found");
        return detail;
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ProblemDetail handleBadRequest(IllegalArgumentException e) {
        // IllegalArgumentException is used only for client-safe business-rule
        // violations (e.g. "Monthly decode limit reached"). Ownership/existence
        // failures use ResourceNotFoundException, and enumeration-sensitive flows
        // (register) throw a fixed generic message — so echoing the message here
        // no longer leaks internal state.
        ProblemDetail detail = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, e.getMessage());
        detail.setType(URI.create("about:blank"));
        detail.setTitle("Bad Request");
        return detail;
    }

    @ExceptionHandler(QuotaExceededException.class)
    public ProblemDetail handleQuotaExceeded(QuotaExceededException e) {
        // 402 so the client can distinguish "out of plan quota" from a validation
        // error and route the user to the upgrade screen.
        ProblemDetail detail = ProblemDetail.forStatusAndDetail(HttpStatus.PAYMENT_REQUIRED, e.getMessage());
        detail.setType(URI.create("about:blank"));
        detail.setTitle("Quota Exceeded");
        return detail;
    }

    @ExceptionHandler(RateLimitExceededException.class)
    public ProblemDetail handleRateLimit(RateLimitExceededException e) {
        ProblemDetail detail = ProblemDetail.forStatusAndDetail(HttpStatus.TOO_MANY_REQUESTS, e.getMessage());
        detail.setType(URI.create("about:blank"));
        detail.setTitle("Too Many Requests");
        return detail;
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ProblemDetail handleValidationError(MethodArgumentNotValidException e) {
        ProblemDetail detail = ProblemDetail.forStatus(HttpStatus.BAD_REQUEST);
        detail.setType(URI.create("about:blank"));
        detail.setTitle("Validation Failed");
        var errors = e.getBindingResult().getFieldErrors().stream()
                .map(fe -> Map.of("field", fe.getField(), "message", fe.getDefaultMessage())).toList();
        detail.setProperty("errors", errors);
        return detail;
    }

    @ExceptionHandler(Exception.class)
    public ProblemDetail handleInternal(Exception e) {
        log.error("Unhandled exception", e);
        ProblemDetail detail = ProblemDetail.forStatus(HttpStatus.INTERNAL_SERVER_ERROR);
        detail.setType(URI.create("about:blank"));
        detail.setTitle("Internal Server Error");
        return detail;
    }
}
