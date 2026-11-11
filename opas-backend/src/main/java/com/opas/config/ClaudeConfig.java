package com.opas.config;

import com.anthropic.bedrock.backends.BedrockMantleBackend;
import com.anthropic.client.AnthropicClient;
import com.anthropic.client.okhttp.AnthropicOkHttpClient;
import java.time.Duration;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.auth.credentials.DefaultCredentialsProvider;
import software.amazon.awssdk.regions.Region;

@Configuration
public class ClaudeConfig {

    /** {@code opas.ai.provider}: where Claude runs. */
    public static final String BEDROCK = "bedrock";
    public static final String ANTHROPIC = "anthropic";

    @Bean
    public AnthropicClient anthropicClient(@Value("${opas.ai.provider:anthropic}") String provider,
            @Value("${opas.ai.bedrock-region:eu-north-1}") String bedrockRegion,
            @Value("${opas.ai.api-key:}") String apiKey) {
        var builder = AnthropicOkHttpClient.builder()
                // The SDK retries 408/409/429/5xx and connection errors itself.
                .maxRetries(2)
                // A decode can take a while on a long letter; the default 10 min is plenty,
                // but fail well before the RabbitMQ consumer looks hung.
                .timeout(Duration.ofMinutes(5));
        switch (provider) {
            case BEDROCK -> builder.backend(BedrockMantleBackend.builder()
                    // Bedrock's Messages endpoint (bedrock-mantle) serves only the region it's
                    // called in, so letter text stays there.
                    .region(Region.of(bedrockRegion))
                    // The ECS task role in production; local AWS credentials in development.
                    .awsCredentialsProvider(DefaultCredentialsProvider.builder().build())
                    .build());
            case ANTHROPIC -> {
                if (apiKey.isBlank()) {
                    throw new IllegalStateException("opas.ai.provider=anthropic needs ANTHROPIC_API_KEY");
                }
                builder.apiKey(apiKey);
            }
            default -> throw new IllegalStateException(
                    "opas.ai.provider must be 'bedrock' or 'anthropic', not '" + provider + "'");
        }
        return builder.build();
    }
}
