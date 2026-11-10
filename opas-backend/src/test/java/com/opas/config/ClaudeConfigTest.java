package com.opas.config;

import static org.junit.jupiter.api.Assertions.*;

import org.junit.jupiter.api.Test;

class ClaudeConfigTest {

    private final ClaudeConfig config = new ClaudeConfig();

    @Test
    void bedrockClientStartsWithoutCredentials() {
        // Credentials (the ECS task role) are resolved per request, not at startup, so the
        // app and its tests start without AWS credentials.
        assertNotNull(config.anthropicClient("bedrock", "eu-north-1", ""));
    }

    @Test
    void anthropicProviderNeedsAnApiKey() {
        assertThrows(IllegalStateException.class, () -> config.anthropicClient("anthropic", "eu-north-1", " "));
        assertNotNull(config.anthropicClient("anthropic", "eu-north-1", "sk-test"));
    }

    @Test
    void unknownProviderIsRejected() {
        var e = assertThrows(IllegalStateException.class, () -> config.anthropicClient("openai", "eu-north-1", ""));
        assertTrue(e.getMessage().contains("bedrock"));
    }
}
