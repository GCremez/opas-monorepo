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

    @Bean(destroyMethod = "close")
    public S3Client s3Client(AwsCredentialsProvider credentialsProvider) {
        var builder = S3Client.builder().region(Region.of(region));

        if (!endpoint.isBlank()) {
            builder.endpointOverride(URI.create(endpoint)).forcePathStyle(true);
        }

        builder.credentialsProvider(credentialsProvider);
        return builder.build();
    }

    @Bean(destroyMethod = "close")
    public software.amazon.awssdk.services.textract.TextractClient textractClient(
            AwsCredentialsProvider credentialsProvider) {
        var builder = software.amazon.awssdk.services.textract.TextractClient.builder().region(Region.of(region));
        if (!endpoint.isBlank()) {
            builder.endpointOverride(URI.create(endpoint));
        }
        builder.credentialsProvider(credentialsProvider);
        return builder.build();
    }

    @Bean(destroyMethod = "close")
    public S3Presigner s3Presigner(AwsCredentialsProvider credentialsProvider) {
        var builder = S3Presigner.builder().region(Region.of(region));

        if (!endpoint.isBlank()) {
            builder.endpointOverride(URI.create(endpoint));
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
