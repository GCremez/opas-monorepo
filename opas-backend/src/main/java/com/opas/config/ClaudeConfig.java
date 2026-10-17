package com.opas.config;

import com.anthropic.client.AnthropicClient;
import com.anthropic.client.okhttp.AnthropicOkHttpClient;
import java.time.Duration;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class ClaudeConfig {

    @Bean
    public AnthropicClient anthropicClient(@Value("${opas.ai.api-key}") String apiKey) {
        return AnthropicOkHttpClient.builder()
                .apiKey(apiKey)
                // The SDK retries 408/409/429/5xx and connection errors itself.
                .maxRetries(2)
                // A decode can take a while on a long letter; the default 10 min is plenty,
                // but fail well before the RabbitMQ consumer looks hung.
                .timeout(Duration.ofMinutes(5))
                .build();
    }
}
