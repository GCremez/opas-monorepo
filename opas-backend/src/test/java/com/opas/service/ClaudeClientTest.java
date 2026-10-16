package com.opas.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import com.anthropic.client.AnthropicClient;
import com.anthropic.core.JsonValue;
import com.anthropic.models.beta.messages.BetaContentBlock;
import com.anthropic.models.beta.messages.BetaMessage;
import com.anthropic.models.beta.messages.BetaStopReason;
import com.anthropic.models.beta.messages.BetaTextBlock;
import com.anthropic.models.beta.messages.BetaUsage;
import com.anthropic.models.beta.messages.MessageCreateParams;
import com.anthropic.models.messages.Model;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.mockito.Answers;
import org.mockito.ArgumentCaptor;

class ClaudeClientTest {

    private final AnthropicClient anthropic = mock(AnthropicClient.class, Answers.RETURNS_DEEP_STUBS);

    private BetaMessage reply(BetaStopReason stop, BetaContentBlock... blocks) {
        BetaMessage message = mock(BetaMessage.class);
        when(message.stopReason()).thenReturn(Optional.of(stop));
        when(message.content()).thenReturn(List.of(blocks));
        when(message.model()).thenReturn(Model.of("claude-sonnet-5-5"));
        BetaUsage usage = mock(BetaUsage.class);
        when(usage.inputTokens()).thenReturn(1000L);
        when(usage.outputTokens()).thenReturn(200L);
        when(message.usage()).thenReturn(usage);
        when(anthropic.beta().messages().create(any(MessageCreateParams.class))).thenReturn(message);
        return message;
    }

    private static BetaContentBlock text(String value) {
        BetaTextBlock textBlock = mock(BetaTextBlock.class);
        when(textBlock.text()).thenReturn(value);
        BetaContentBlock block = mock(BetaContentBlock.class);
        when(block.text()).thenReturn(Optional.of(textBlock));
        return block;
    }

    private static BetaContentBlock thinking() {
        BetaContentBlock block = mock(BetaContentBlock.class);
        when(block.text()).thenReturn(Optional.empty());
        return block;
    }

    private MessageCreateParams sentParams() {
        var captor = ArgumentCaptor.forClass(MessageCreateParams.class);
        verify(anthropic.beta().messages()).create(captor.capture());
        return captor.getValue();
    }

    @Test
    void returnsOnlyTextBlocksAndUsage() {
        reply(BetaStopReason.END_TURN, thinking(), text("{\"title\":"), text(" \"Kela\"}"));

        var result = new ClaudeClient(anthropic, "claude-sonnet-5-5", 16000, true).complete("prompt");

        assertEquals("{\"title\": \"Kela\"}", result.text());
        assertEquals("claude-sonnet-5-5", result.model());
        assertEquals(1000, result.inputTokens());
        assertEquals(200, result.outputTokens());
    }

    @Test
    void sendsNoTemperatureAndEnablesServerSideFallback() {
        reply(BetaStopReason.END_TURN, text("ok"));

        new ClaudeClient(anthropic, "claude-sonnet-5-5", 16000, true).complete("prompt");

        MessageCreateParams params = sentParams();
        // Current models reject non-default sampling parameters.
        assertTrue(params.temperature().isEmpty());
        assertEquals(16000, params.maxTokens());
        assertEquals(JsonValue.from("default"), params._additionalBodyProperties().get("fallbacks"));
        assertTrue(params.betas().orElseThrow().stream()
                .anyMatch(b -> b.asString().equals("server-side-fallback-2026-07-01")));
    }

    @Test
    void fallbackCanBeTurnedOff() {
        reply(BetaStopReason.END_TURN, text("ok"));

        new ClaudeClient(anthropic, "claude-sonnet-5-5", 16000, false).complete("prompt");

        MessageCreateParams params = sentParams();
        assertNull(params._additionalBodyProperties().get("fallbacks"));
        assertTrue(params.betas().map(List::isEmpty).orElse(true));
    }

    @Test
    void refusalIsRaisedInsteadOfReturnedAsText() {
        reply(BetaStopReason.REFUSAL);

        assertThrows(ClaudeRefusalException.class,
                () -> new ClaudeClient(anthropic, "claude-sonnet-5-5", 16000, true).complete("prompt"));
    }
}
