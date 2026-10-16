package com.opas.service;

import com.anthropic.client.AnthropicClient;
import com.anthropic.core.JsonValue;
import com.anthropic.models.beta.messages.BetaMessage;
import com.anthropic.models.beta.messages.BetaStopReason;
import com.anthropic.models.beta.messages.BetaTextBlock;
import com.anthropic.models.beta.messages.MessageCreateParams;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

/**
 * Single place the app talks to Claude. Decode and draft-letter generation both send one
 * prompt and read back text, so that's all this exposes.
 *
 * <p>No temperature is sent and thinking is left at the model default: current models
 * reject non-default sampling parameters and return thinking blocks, which are skipped
 * here — only text blocks make up the reply.
 */
@Service
public class ClaudeClient {

    private static final Logger log = LoggerFactory.getLogger(ClaudeClient.class);

    /** Server-side refusal fallback: Anthropic retries a declined request on another model. */
    private static final String FALLBACK_BETA = "server-side-fallback-2026-07-01";

    public record Reply(String text, String model, long inputTokens, long outputTokens) {
    }

    private final AnthropicClient client;
    private final String model;
    private final long maxTokens;
    private final boolean refusalFallback;

    public ClaudeClient(AnthropicClient client,
            @Value("${opas.ai.model}") String model,
            @Value("${opas.ai.max-tokens}") long maxTokens,
            @Value("${opas.ai.refusal-fallback:true}") boolean refusalFallback) {
        this.client = client;
        this.model = model;
        this.maxTokens = maxTokens;
        this.refusalFallback = refusalFallback;
    }

    public String model() {
        return model;
    }

    public Reply complete(String prompt) {
        var params = MessageCreateParams.builder()
                .model(model)
                .maxTokens(maxTokens)
                .addUserMessage(prompt);
        if (refusalFallback) {
            // "default" lets the API pick the fallback model by refusal category, so there's
            // no model list to maintain here.
            params.addBeta(FALLBACK_BETA).putAdditionalBodyProperty("fallbacks", JsonValue.from("default"));
        }
        BetaMessage message = client.beta().messages().create(params.build());

        BetaStopReason stop = message.stopReason().orElse(null);
        if (BetaStopReason.REFUSAL.equals(stop)) {
            throw new ClaudeRefusalException("Claude declined to process this document");
        }
        if (BetaStopReason.MAX_TOKENS.equals(stop)) {
            log.warn("Claude reply hit max_tokens ({}); the output may be cut off", maxTokens);
        }
        String text = message.content().stream()
                .flatMap(block -> block.text().stream())
                .map(BetaTextBlock::text)
                .collect(Collectors.joining());
        // With a fallback the answer can come from a different model than requested.
        return new Reply(text, message.model().asString(), message.usage().inputTokens(),
                message.usage().outputTokens());
    }
}
