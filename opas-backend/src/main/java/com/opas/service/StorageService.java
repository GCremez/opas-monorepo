package com.opas.service;

import java.time.Duration;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.core.ResponseBytes;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.PresignedPutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.model.PutObjectPresignRequest;

@Service
public class StorageService {

    private final S3Client s3Client;
    private final S3Presigner s3Presigner;
    private final String bucketName;

    public StorageService(S3Client s3Client, S3Presigner s3Presigner, @Value("${opas.s3.bucket}") String bucketName) {
        this.s3Client = s3Client;
        this.s3Presigner = s3Presigner;
        this.bucketName = bucketName;
    }

    public String generatePresignedUploadUrl(String key, String contentType, Duration ttl) {
        var objectRequest = PutObjectRequest.builder().bucket(bucketName).key(key).contentType(contentType).build();

        var presignRequest = PutObjectPresignRequest.builder().putObjectRequest(objectRequest).signatureDuration(ttl)
                .build();

        PresignedPutObjectRequest presigned = s3Presigner.presignPutObject(presignRequest);
        return presigned.url().toString();
    }

    public String generatePresignedDownloadUrl(String key, Duration ttl) {
        var objectRequest = GetObjectRequest.builder().bucket(bucketName).key(key).build();

        var presignRequest = software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest.builder()
                .getObjectRequest(objectRequest).signatureDuration(ttl).build();

        var presigned = s3Presigner.presignGetObject(presignRequest);
        return presigned.url().toString();
    }

    public byte[] getObjectBytes(String key) {
        ResponseBytes<?> bytes = s3Client
                .getObjectAsBytes(GetObjectRequest.builder().bucket(bucketName).key(key).build());
        return bytes.asByteArray();
    }

    public void deleteObject(String key) {
        s3Client.deleteObject(DeleteObjectRequest.builder().bucket(bucketName).key(key).build());
    }

    public String getBucketName() {
        return bucketName;
    }
}
