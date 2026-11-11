package com.opas.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.mock;

import java.net.URI;
import java.time.Duration;
import org.junit.jupiter.api.Test;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;

/**
 * The phone uploads straight to S3 with the URL from generatePresignedUploadUrl, sending
 * only Content-Type and Content-Length. AWS SDK 2.30+ adds checksums to S3 requests by
 * default; a URL that signed a checksum header the phone doesn't send would fail every
 * upload with SignatureDoesNotMatch. Built with a real presigner, offline.
 */
class PresignedUploadUrlTest {

    @Test
    void uploadUrlSignsOnlyWhatThePhoneSends() {
        S3Presigner presigner = S3Presigner.builder()
                .region(Region.EU_NORTH_1)
                .credentialsProvider(StaticCredentialsProvider.create(AwsBasicCredentials.create("AKIDEXAMPLE", "secret")))
                .build();
        StorageService storage = new StorageService(mock(S3Client.class), presigner, "opas-app-bucket");

        String url = storage.generatePresignedUploadUrl("user/doc.pdf", "application/pdf", 1234, Duration.ofMinutes(15));
        String query = URI.create(url).getRawQuery();

        assertFalse(query.toLowerCase().contains("checksum"), query);
        assertTrue(query.contains("X-Amz-SignedHeaders=content-length%3Bcontent-type%3Bhost"), query);
    }
}
