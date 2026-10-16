package com.opas.config;

import java.net.URI;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.AwsCredentialsProvider;
import software.amazon.awssdk.auth.credentials.DefaultCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;

@Configuration
public class S3Config {

    @Value("${opas.s3.region:eu-north-1}")
    private String region;

    @Value("${opas.s3.endpoint:}")
    private String endpoint;

    @Value("${opas.s3.access-key:}")
    private String accessKey;

    @Value("${opas.s3.secret-key:}")
    private String secretKey;

    // Dedicated SES settings so transactional email can hit real AWS while S3/Textract
    // stay on LocalStack in local dev. Empty values fall back to the shared S3
    // configuration (region + default credential chain) — the deployed ECS posture,
    // where the task role supplies credentials and no endpoint override exists.
    @Value("${opas.ses.region:}")
    private String sesRegion;

    @Value("${opas.ses.access-key:}")
    private String sesAccessKey;

    @Value("${opas.ses.secret-key:}")
    private String sesSecretKey;

    @Value("${opas.ses.endpoint:}")
    private String sesEndpoint;

    @Bean(destroyMethod = "close")
    public S3Client s3Client(AwsCredentialsProvider credentialsProvider) {
        var builder = S3Client.builder().region(Region.of(region));

        if (!endpoint.isBlank()) {
            builder.endpointOverride(URI.create(endpoint)).forcePathStyle(true);
        }

        builder.credentialsProvider(credentialsProvider);
        return builder.build();
    }

    // Textract isn't offered in eu-north-1 (where everything else runs), so it gets its own
    // region, defaulting to Frankfurt to keep documents in the EU. Like SES it never
    // inherits the S3 endpoint override: LocalStack's free tier has no Textract, so local
    // dev calls real AWS with dedicated credentials while S3 stays on LocalStack.
    @Value("${opas.textract.region:eu-central-1}")
    private String textractRegion;

    @Value("${opas.textract.access-key:}")
    private String textractAccessKey;

    @Value("${opas.textract.secret-key:}")
    private String textractSecretKey;

    @Value("${opas.textract.endpoint:}")
    private String textractEndpoint;

    @Bean(destroyMethod = "close")
    public software.amazon.awssdk.services.textract.TextractClient textractClient(
            AwsCredentialsProvider credentialsProvider) {
        var builder = software.amazon.awssdk.services.textract.TextractClient.builder()
                .region(Region.of(textractRegion));
        if (!textractEndpoint.isBlank()) {
            builder.endpointOverride(URI.create(textractEndpoint));
        }
        if (!textractAccessKey.isBlank() && !textractSecretKey.isBlank()) {
            builder.credentialsProvider(() -> AwsBasicCredentials.create(textractAccessKey, textractSecretKey));
        } else {
            builder.credentialsProvider(credentialsProvider);
        }
        return builder.build();
    }

    @Bean(destroyMethod = "close")
    public software.amazon.awssdk.services.sesv2.SesV2Client sesV2Client(AwsCredentialsProvider credentialsProvider) {
        var builder = software.amazon.awssdk.services.sesv2.SesV2Client.builder()
                .region(Region.of(sesRegion.isBlank() ? region : sesRegion));
        // Never inherit the S3 endpoint override — SES must reach real AWS even when
        // S3 is pointed at LocalStack. A dedicated override can still be set via
        // opas.ses.endpoint for tests.
        if (!sesEndpoint.isBlank()) {
            builder.endpointOverride(URI.create(sesEndpoint));
        }
        if (!sesAccessKey.isBlank() && !sesSecretKey.isBlank()) {
            builder.credentialsProvider(() -> AwsBasicCredentials.create(sesAccessKey, sesSecretKey));
        } else {
            builder.credentialsProvider(credentialsProvider);
        }
        return builder.build();
    }

    @Bean(destroyMethod = "close")
    public S3Presigner s3Presigner(AwsCredentialsProvider credentialsProvider) {
        var builder = S3Presigner.builder().region(Region.of(region));

        if (!endpoint.isBlank()) {
            // Path-style like the S3Client above. Without it presigned links point at
            // <bucket>.localhost:4566, which LocalStack reads as a bucket named after the
            // key's first segment, so every upload from the app failed with NoSuchBucket.
            builder.endpointOverride(URI.create(endpoint))
                    .serviceConfiguration(software.amazon.awssdk.services.s3.S3Configuration.builder()
                            .pathStyleAccessEnabled(true).build());
        }

        builder.credentialsProvider(credentialsProvider);
        return builder.build();
    }

    @Bean(destroyMethod = "")
    public AwsCredentialsProvider credentialsProvider() {
        if (!accessKey.isBlank() && !secretKey.isBlank()) {
            return () -> AwsBasicCredentials.create(accessKey, secretKey);
        }
        return DefaultCredentialsProvider.create();
    }
}
