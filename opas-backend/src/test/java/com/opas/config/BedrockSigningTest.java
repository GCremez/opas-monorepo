package com.opas.config;

import static org.junit.jupiter.api.Assertions.*;

import com.anthropic.bedrock.backends.BedrockMantleBackend;
import com.anthropic.core.http.HttpMethod;
import com.anthropic.core.http.HttpRequest;
import org.junit.jupiter.api.Test;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;

/**
 * Signs a Bedrock request offline. This is where a mismatched AWS SDK (the Bedrock module
 * needs the version the S3/Textract/SES modules are pinned to in the pom) fails at
 * runtime, and it checks requests go to the Stockholm endpoint, so letters stay there.
 */
class BedrockSigningTest {

    @Test
    void requestsAreSignedForTheStockholmEndpoint() {
        BedrockMantleBackend backend = BedrockMantleBackend.builder()
                .region(Region.EU_NORTH_1)
                .awsCredentialsProvider(StaticCredentialsProvider.create(AwsBasicCredentials.create("AKIDEXAMPLE", "secret")))
                .build();

        HttpRequest request = HttpRequest.builder()
                .method(HttpMethod.POST)
                .baseUrl(backend.baseUrl())
                .addPathSegments("v1", "messages")
                .putHeader("content-type", "application/json")
                .build();
        HttpRequest signed = backend.authorizeRequest(backend.prepareRequest(request));

        assertTrue(signed.url().startsWith("https://bedrock-mantle.eu-north-1.api.aws/"), signed.url());
        String auth = String.join(",", signed.headers().values("Authorization"));
        assertTrue(auth.startsWith("AWS4-HMAC-SHA256 Credential=AKIDEXAMPLE/"), auth);
        assertTrue(auth.contains("/eu-north-1/bedrock-mantle/aws4_request"), auth);
    }
}
