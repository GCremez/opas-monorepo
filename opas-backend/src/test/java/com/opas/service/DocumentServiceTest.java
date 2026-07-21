package com.opas.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.opas.domain.Document;
import com.opas.domain.User;
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

@ExtendWith(MockitoExtension.class)
class DocumentServiceTest {

    @Mock
    private DocumentRepository documentRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private StorageService storageService;

    private DocumentService service;
    private UUID userId;
    private User user;
    private UUID documentId;
    private Document document;

    @BeforeEach
    void setUp() {
        service = new DocumentService(documentRepository, userRepository, storageService, 15);
        userId = UUID.randomUUID();
        user = new User();
        user.setId(userId);
        documentId = UUID.randomUUID();
        document = new Document();
        document.setId(documentId);
        document.setUser(user);
        document.setFilename("test.pdf");
        document.setContentType("application/pdf");
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
        when(storageService.generatePresignedUploadUrl(anyString(), eq("application/pdf"), any(Duration.class)))
                .thenReturn("https://presigned.url");

        DocumentResponse response = service.requestUploadUrl(userId,
                new UploadUrlRequest("test.pdf", "application/pdf"));

        assertNotNull(response);
        assertEquals("test.pdf", response.filename());
        assertEquals("https://presigned.url", response.uploadUrl());
        verify(documentRepository).save(any());
    }

    @Test
    void confirmUploadUpdatesStatusToUploaded() {
        when(documentRepository.findById(documentId)).thenReturn(Optional.of(document));

        service.confirmUpload(userId, documentId);

        assertEquals("uploaded", document.getStatus());
        verify(documentRepository).save(document);
    }

    @Test
    void confirmUploadThrowsWhenNotFound() {
        when(documentRepository.findById(documentId)).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class, () -> service.confirmUpload(userId, documentId));
    }

    @Test
    void confirmUploadThrowsWhenNotOwner() {
        UUID otherUserId = UUID.randomUUID();
        when(documentRepository.findById(documentId)).thenReturn(Optional.of(document));

        assertThrows(IllegalArgumentException.class, () -> service.confirmUpload(otherUserId, documentId));
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

        assertThrows(IllegalArgumentException.class, () -> service.getDocument(otherUserId, documentId));
    }

    @Test
    void deleteDocumentRemovesFromS3AndDb() {
        document.setStatus("uploaded");
        when(documentRepository.findById(documentId)).thenReturn(Optional.of(document));

        service.deleteDocument(userId, documentId);

        verify(storageService).deleteObject(document.getS3Key());
        verify(documentRepository).delete(document);
    }

    @Test
    void deleteDocumentThrowsWhenNotOwner() {
        UUID otherUserId = UUID.randomUUID();
        when(documentRepository.findById(documentId)).thenReturn(Optional.of(document));

        assertThrows(IllegalArgumentException.class, () -> service.deleteDocument(otherUserId, documentId));

        verify(storageService, never()).deleteObject(any());
        verify(documentRepository, never()).delete(any());
    }
}
