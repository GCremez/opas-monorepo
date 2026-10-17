package com.opas.service;

import com.opas.config.ResourceNotFoundException;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.opas.domain.Document;
import com.opas.domain.User;
import com.opas.dto.ConfirmUploadRequest;
import com.opas.dto.DocumentResponse;
import com.opas.dto.UploadUrlRequest;
import com.opas.repository.DocumentRepository;
import com.opas.repository.UserRepository;
import java.time.Duration;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import software.amazon.awssdk.services.s3.model.HeadObjectResponse;

@ExtendWith(MockitoExtension.class)
class DocumentServiceTest {

    @Mock
    private DocumentRepository documentRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private StorageService storageService;
    @Mock
    private com.opas.repository.FolderRepository folderRepository;
    @Mock
    private com.opas.repository.DecodeResultRepository decodeResultRepository;

    private DocumentService service;
    private UUID userId;
    private User user;
    private UUID documentId;
    private Document document;

    @BeforeEach
    void setUp() {
        service = new DocumentService(documentRepository, userRepository, folderRepository,
                decodeResultRepository, storageService,
                new DocumentInsights(new com.fasterxml.jackson.databind.ObjectMapper()), 15);
        userId = UUID.randomUUID();
        user = new User();
        user.setId(userId);
        documentId = UUID.randomUUID();
        document = new Document();
        document.setId(documentId);
        document.setUser(user);
        document.setFilename("test.pdf");
        document.setContentType("application/pdf");
        document.setFileSize(1024L);
        document.setStatus("pending");
        document.setS3Key(userId + "/" + UUID.randomUUID() + "/test.pdf");
    }

    @Test
    void requestUploadUrlCreatesDocumentAndReturnsPresignedUrl() {
        when(userRepository.getReferenceById(userId)).thenReturn(user);
        when(documentRepository.save(any())).thenAnswer(invocation -> {
            Document d = invocation.getArgument(0);
            d.setId(documentId);
            return d;
        });
        when(storageService.generatePresignedUploadUrl(anyString(), eq("application/pdf"), eq(1024L),
                any(Duration.class)))
                .thenReturn("https://presigned.url");

        DocumentResponse response = service.requestUploadUrl(userId,
                new UploadUrlRequest("test.pdf", "application/pdf", 1024));

        assertNotNull(response);
        assertEquals("test.pdf", response.filename());
        assertEquals("https://presigned.url", response.uploadUrl());
        verify(documentRepository).save(any());
    }

    @Test
    void confirmUploadUpdatesStatusToUploaded() {
        when(documentRepository.findById(documentId)).thenReturn(Optional.of(document));
        when(storageService.headObject(document.getS3Key()))
                .thenReturn(HeadObjectResponse.builder()
                        .contentType("application/pdf")
                        .contentLength(1024L)
                        .build());

        service.confirmUpload(userId, documentId, null);

        assertEquals("uploaded", document.getStatus());
        verify(documentRepository).save(document);
    }

    @Test
    void confirmUploadThrowsWhenNotFound() {
        when(documentRepository.findById(documentId)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> service.confirmUpload(userId, documentId, null));
    }

    @Test
    void confirmUploadThrowsWhenNotOwner() {
        UUID otherUserId = UUID.randomUUID();
        when(documentRepository.findById(documentId)).thenReturn(Optional.of(document));

        assertThrows(ResourceNotFoundException.class, () -> service.confirmUpload(otherUserId, documentId, null));
    }

    @Test
    void confirmUploadRejectsS3ContentTypeMismatch() {
        when(documentRepository.findById(documentId)).thenReturn(Optional.of(document));
        // S3 object has a different content-type than what was declared at upload time.
        when(storageService.headObject(document.getS3Key()))
                .thenReturn(HeadObjectResponse.builder()
                        .contentType("image/jpeg")
                        .contentLength(1024L)
                        .build());

        assertThrows(IllegalArgumentException.class,
                () -> service.confirmUpload(userId, documentId, null));
    }

    @Test
    void confirmUploadRejectsS3FileSizeMismatch() {
        when(documentRepository.findById(documentId)).thenReturn(Optional.of(document));
        // S3 object is larger than declared — client uploaded a bigger file.
        when(storageService.headObject(document.getS3Key()))
                .thenReturn(HeadObjectResponse.builder()
                        .contentType("application/pdf")
                        .contentLength(999_999L)
                        .build());

        assertThrows(IllegalArgumentException.class,
                () -> service.confirmUpload(userId, documentId, null));
    }

    @Test
    void confirmUploadRejectsMissingS3Object() {
        when(documentRepository.findById(documentId)).thenReturn(Optional.of(document));
        when(storageService.headObject(document.getS3Key())).thenReturn(null);

        assertThrows(IllegalArgumentException.class,
                () -> service.confirmUpload(userId, documentId, null));
    }

    @Test
    void listDocumentsReturnsUserDocuments() {
        document.setStatus("uploaded");
        when(documentRepository.findByUserIdAndStatusNotOrderByCreatedAtDesc(userId, "archived"))
                .thenReturn(List.of(document));
        when(storageService.generatePresignedDownloadUrl(anyString(), any(Duration.class)))
                .thenReturn("https://download.url");

        List<DocumentResponse> responses = service.listDocuments(userId);

        assertEquals(1, responses.size());
        assertEquals("test.pdf", responses.getFirst().filename());
        assertNotNull(responses.getFirst().downloadUrl());
    }

    @Test
    void listDocumentsIncludesLatestDecodeInsights() {
        document.setStatus("ready");
        when(documentRepository.findByUserIdAndStatusNotOrderByCreatedAtDesc(userId, "archived"))
                .thenReturn(List.of(document));
        var newer = new com.opas.domain.DecodeResult();
        newer.setDocument(document);
        newer.setStructuredData("""
                {"title": "Tax decision", "authority": "Vero",
                 "deadlines": [{"date": "2026-06-30", "description": "Pay remaining tax"}]}""");
        var older = new com.opas.domain.DecodeResult();
        older.setDocument(document);
        older.setStructuredData("{\"title\": \"Old title\"}");
        // Repository returns newest first; the newest decode must win.
        when(decodeResultRepository.findByUserIdOrderByCreatedAtDesc(userId)).thenReturn(List.of(newer, older));

        DocumentResponse response = service.listDocuments(userId).getFirst();

        assertEquals("Tax decision", response.title());
        assertEquals("Vero", response.authority());
        assertEquals("2026-06-30", response.deadlines().getFirst().date());
    }

    @Test
    void getDocumentReturnsDocumentWithDownloadUrl() {
        document.setStatus("ready");
        when(documentRepository.findById(documentId)).thenReturn(Optional.of(document));
        when(storageService.generatePresignedDownloadUrl(anyString(), any(Duration.class)))
                .thenReturn("https://download.url");

        DocumentResponse response = service.getDocument(userId, documentId);

        assertNotNull(response);
        assertEquals("test.pdf", response.filename());
        assertEquals("https://download.url", response.downloadUrl());
    }

    @Test
    void getDocumentThrowsWhenNotOwner() {
        UUID otherUserId = UUID.randomUUID();
        when(documentRepository.findById(documentId)).thenReturn(Optional.of(document));

        assertThrows(ResourceNotFoundException.class, () -> service.getDocument(otherUserId, documentId));
    }

    @Test
    void deleteDocumentRemovesFromS3AndDb() {
        document.setStatus("uploaded");
        when(documentRepository.findById(documentId)).thenReturn(Optional.of(document));

        service.deleteDocument(userId, documentId);

        verify(decodeResultRepository).deleteByDocumentId(documentId);
        verify(storageService).deleteObject(document.getS3Key());
        verify(documentRepository).delete(document);
    }

    @Test
    void deleteDocumentThrowsWhenNotOwner() {
        UUID otherUserId = UUID.randomUUID();
        when(documentRepository.findById(documentId)).thenReturn(Optional.of(document));

        assertThrows(ResourceNotFoundException.class, () -> service.deleteDocument(otherUserId, documentId));

        verify(storageService, never()).deleteObject(any());
        verify(documentRepository, never()).delete(any());
    }

    @Test
    void assigningAFolderRecordsItAsTheUsersChoice() {
        document.setStatus("ready");
        when(documentRepository.findById(documentId)).thenReturn(Optional.of(document));
        when(documentRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        service.assignFolder(userId, documentId, null);

        assertTrue(document.isFolderSetByUser());
        assertNull(document.getFolderId());
    }
}
