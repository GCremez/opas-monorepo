package com.opas.listener;

import com.opas.dto.DecodeMessage;
import com.opas.service.DecodeService;
import com.opas.service.PresidioUnavailableException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.core.Message;
import org.springframework.amqp.rabbit.listener.api.ChannelAwareMessageListener;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.stereotype.Component;

@Component
public class DecodeMessageListener implements ChannelAwareMessageListener {

    private static final Logger log = LoggerFactory.getLogger(DecodeMessageListener.class);

    /**
     * Maximum number of processing attempts before the message is dead-lettered.
     * Transient errors (529 overloaded, Presidio blip, S3 timeout) are retried with
     * exponential backoff. Only permanent failures or exhausted retries DLQ.
     */
    private static final int MAX_ATTEMPTS = 3;
    private static final long INITIAL_BACKOFF_MS = 1_000;

    private final DecodeService decodeService;
    private final Jackson2JsonMessageConverter messageConverter;

    public DecodeMessageListener(DecodeService decodeService, Jackson2JsonMessageConverter messageConverter) {
        this.decodeService = decodeService;
        this.messageConverter = messageConverter;
    }

    @Override
    public void onMessage(Message message, com.rabbitmq.client.Channel channel) throws Exception {
        DecodeMessage decodeMessage = (DecodeMessage) messageConverter.fromMessage(message);
        long deliveryTag = message.getMessageProperties().getDeliveryTag();
        log.info("Processing decode: userId={}, documentId={}", decodeMessage.userId(), decodeMessage.documentId());

        Exception lastException = null;
        for (int attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
            try {
                decodeService.processDecode(decodeMessage);
                channel.basicAck(deliveryTag, false);
                log.info("Decode completed: userId={}, documentId={}, attempt={}",
                        decodeMessage.userId(), decodeMessage.documentId(), attempt);
                return;
            } catch (Exception e) {
                lastException = e;
                if (attempt < MAX_ATTEMPTS && isRetryable(e)) {
                    long delay = INITIAL_BACKOFF_MS * (1L << (attempt - 1));
                    log.warn("Retryable decode error (attempt {}/{}): userId={}, documentId={}, "
                            + "retrying in {}ms: {}",
                            attempt, MAX_ATTEMPTS, decodeMessage.userId(), decodeMessage.documentId(),
                            delay, e.getMessage());
                    try {
                        Thread.sleep(delay);
                    } catch (InterruptedException ie) {
                        Thread.currentThread().interrupt();
                        break;
                    }
                } else {
                    break;
                }
            }
        }

        log.error("Decode failed after retries: userId={}, documentId={}",
                decodeMessage.userId(), decodeMessage.documentId(), lastException);
        try {
            decodeService.markDecodeFailed(decodeMessage.userId(), decodeMessage.documentId());
        } catch (Exception cleanupError) {
            log.error("Failed to mark decode as failed: documentId={}", decodeMessage.documentId(), cleanupError);
        }
        channel.basicNack(deliveryTag, false, false);
    }

    /**
     * Determines whether a failure is transient and worth retrying. Business-logic
     * errors (document not found, unauthorized) are not retried — they'll fail every
     * time. Infrastructure and upstream blips (Presidio, Claude, S3) are retryable.
     */
    private static boolean isRetryable(Exception e) {
        if (e instanceof PresidioUnavailableException) {
            return true;
        }
        // Claude errors are typed by the SDK, which has already retried these twice.
        if (e instanceof com.anthropic.errors.RateLimitException
                || e instanceof com.anthropic.errors.InternalServerException
                || e instanceof com.anthropic.errors.AnthropicIoException) {
            return true;
        }
        if (e instanceof com.opas.service.ClaudeRefusalException
                || e instanceof com.anthropic.errors.AnthropicServiceException) {
            return false; // refusals and 4xx (bad request, auth, billing) fail the same way again
        }
        String message = e.getMessage();
        if (message == null) {
            return false;
        }
        String lower = message.toLowerCase();
        return lower.contains("529")            // Anthropic overloaded
                || lower.contains("overloaded")  // generic overloaded
                || lower.contains("timeout")
                || lower.contains("connection")
                || lower.contains("503")
                || lower.contains("502")
                || lower.contains("429");        // rate limit (shouldn't hit, but safe to retry)
    }
}
