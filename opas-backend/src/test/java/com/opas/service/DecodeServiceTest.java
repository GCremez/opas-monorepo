package com.opas.service;

import com.opas.config.ResourceNotFoundException;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.opas.domain.DecodeResult;
import com.opas.domain.Document;
import com.opas.domain.Subscription;
import com.opas.domain.User;
import com.opas.dto.DecodeMessage;
import com.opas.dto.DecodeRequest;
import com.opas.dto.DecodeResponse;
import com.opas.repository.DecodeResultRepository;
import com.opas.repository.DocumentRepository;
import com.opas.repository.SubscriptionRepository;
import com.opas.repository.UserRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.ai.chat.messages.AssistantMessage;
import org.springframework.ai.chat.metadata.ChatResponseMetadata;
import org.springframework.ai.chat.metadata.Usage;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.chat.model.ChatResponse;
import org.springframework.ai.chat.model.Generation;
import org.springframework.ai.chat.prompt.Prompt;

@ExtendWith(MockitoExtension.class)
class DecodeServiceTest {

    @Mock
    private DocumentRepository documentRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private DecodeResultRepository decodeResultRepository;
    @Mock
    private SubscriptionRepository subscriptionRepository;
    @Mock
    private StorageService storageService;
    @Mock
    private PresidioService presidioService;
    @Mock
    private TextExtractionService textExtractionService;
    @Mock
    private EmbeddingService embeddingService;
    @Mock
    private UsageTracker usageTracker;
    @Mock
    private ChatModel chatModel;

    private DecodeService service;
    private UUID userId;
    private UUID documentId;
    private User user;
    private Document document;

    @BeforeEach
    void setUp() {
        service = new DecodeService(documentRepository, userRepository, decodeResultRepository, subscriptionRepository,
                storageService, presidioService, textExtractionService, embeddingService, usageTracker, chatModel,
                new com.fasterxml.jackson.databind.ObjectMapper(), 5, "claude-sonnet-4-20250514");
        userId = UUID.randomUUID();
        user = new User();
        user.setId(userId);
        documentId = UUID.randomUUID();
        document = new Document();
        document.setId(documentId);
        document.setUser(user);
        document.setFilename("test.pdf");
        document.setStatus("uploaded");
        document.setS3Key(userId + "/doc.pdf");
    }

    @Test
    void validateAndReserveSucceeds() {
        when(documentRepository.findById(documentId)).thenReturn(Optional.of(document));
        when(subscriptionRepository.findByUserId(userId)).thenReturn(Optional.empty());
        when(usageTracker.tryReserve(eq(userId.toString()), eq("decodes"), eq(5))).thenReturn(4L);

        DecodeMessage message = service.validateAndReserve(userId, documentId, true);

        assertNotNull(message);
        assertEquals(userId, message.userId());
        assertEquals(documentId, message.documentId());
        assertTrue(message.scrubPii());
    }

    @Test
    void validateAndReserveThrowsWhenDocumentNotFound() {
        when(documentRepository.findById(documentId)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class,
                () -> service.validateAndReserve(userId, documentId, false));
    }

    @Test
    void validateAndReserveThrowsWhenNotOwner() {
        UUID otherUserId = UUID.randomUUID();
        when(documentRepository.findById(documentId)).thenReturn(Optional.of(document));

        assertThrows(ResourceNotFoundException.class,
                () -> service.validateAndReserve(otherUserId, documentId, false));
    }

    @Test
    void validateAndReserveThrowsWhenNotUploaded() {
        document.setStatus("pending");
        when(documentRepository.findById(documentId)).thenReturn(Optional.of(document));

        assertThrows(IllegalArgumentException.class,
                () -> service.validateAndReserve(userId, documentId, false));
    }

    @Test
    void validateAndReserveThrowsWhenMonthlyLimitReached() {
        when(documentRepository.findById(documentId)).thenReturn(Optional.of(document));
        when(subscriptionRepository.findByUserId(userId)).thenReturn(Optional.empty());
        when(usageTracker.tryReserve(eq(userId.toString()), eq("decodes"), eq(5))).thenReturn(-1L);

        assertThrows(com.opas.config.QuotaExceededException.class,
                () -> service.validateAndReserve(userId, documentId, false));
    }

    @Test
    void premiumUsersBypassFreeTierLimit() {
        when(documentRepository.findById(documentId)).thenReturn(Optional.of(document));
        Subscription sub = new Subscription();
        sub.setTier("premium");
        when(subscriptionRepository.findByUserId(userId)).thenReturn(Optional.of(sub));
        when(usageTracker.tryReserve(eq(userId.toString()), eq("decodes"), eq(Integer.MAX_VALUE)))
                .thenReturn(Integer.MAX_VALUE - 1L);

        DecodeMessage message = service.validateAndReserve(userId, documentId, false);

        assertNotNull(message);
        verify(usageTracker).tryReserve(eq(userId.toString()), eq("decodes"), eq(Integer.MAX_VALUE));
    }

    @Test
    void processDecodeSucceeds() {
        when(decodeResultRepository.findByDocumentId(documentId)).thenReturn(List.of());
        when(documentRepository.findById(documentId)).thenReturn(Optional.of(document));
        when(userRepository.getReferenceById(userId)).thenReturn(user);
        when(storageService.getObjectBytes(anyString())).thenReturn("file content".getBytes());
        when(textExtractionService.extract(any(), any())).thenReturn("file content");
        when(presidioService.scrubPii(anyString())).thenReturn("scrubbed content");

        ChatResponse chatResponse = mock(ChatResponse.class);
        Generation generation = mock(Generation.class);
        AssistantMessage message = mock(AssistantMessage.class);
        when(chatResponse.getResult()).thenReturn(generation);
        when(generation.getOutput()).thenReturn(message);
        when(message.getText()).thenReturn("decoded text");
        when(chatResponse.getMetadata()).thenReturn(mock(ChatResponseMetadata.class));
        when(chatResponse.getMetadata().getUsage()).thenReturn(mock(Usage.class));
        when(chatModel.call(any(Prompt.class))).thenReturn(chatResponse);

        when(decodeResultRepository.save(any())).thenAnswer(invocation -> {
            DecodeResult r = invocation.getArgument(0);
            r.setId(UUID.randomUUID());
            return r;
        });

        DecodeMessage decodeMessage = new DecodeMessage(userId, documentId, true);
        service.processDecode(decodeMessage);

        verify(documentRepository).save(document);
        assertEquals("ready", document.getStatus());
    }

    @Test
    void processDecodeSkipsPiiScrubWhenFlagFalse() {
        when(decodeResultRepository.findByDocumentId(documentId)).thenReturn(List.of());
        when(documentRepository.findById(documentId)).thenReturn(Optional.of(document));
        when(userRepository.getReferenceById(userId)).thenReturn(user);
        when(storageService.getObjectBytes(anyString())).thenReturn("file content".getBytes());
        when(textExtractionService.extract(any(), any())).thenReturn("file content");

        mockChatModel();

        when(decodeResultRepository.save(any())).thenAnswer(invocation -> {
            DecodeResult r = invocation.getArgument(0);
            r.setId(UUID.randomUUID());
            return r;
        });

        DecodeMessage decodeMessage = new DecodeMessage(userId, documentId, false);
        service.processDecode(decodeMessage);

        verify(presidioService, never()).scrubPii(anyString());
    }

    @Test
    void processDecodeSkipsIfResultAlreadyExists() {
        DecodeResult existingResult = new DecodeResult();
        existingResult.setId(UUID.randomUUID());
        when(decodeResultRepository.findByDocumentId(documentId)).thenReturn(List.of(existingResult));

        DecodeMessage decodeMessage = new DecodeMessage(userId, documentId, true);
        service.processDecode(decodeMessage);

        // Should NOT have touched the document or storage — the guard short-circuits.
        verify(documentRepository, never()).findById(any());
        verify(storageService, never()).getObjectBytes(any());
        verify(chatModel, never()).call(any(Prompt.class));
    }

    private void mockChatModel() {
        ChatResponse chatResponse = mock(ChatResponse.class);
        Generation generation = mock(Generation.class);
        AssistantMessage message = mock(AssistantMessage.class);
        when(chatResponse.getResult()).thenReturn(generation);
        when(generation.getOutput()).thenReturn(message);
        when(message.getText()).thenReturn("decoded text");
        when(chatResponse.getMetadata()).thenReturn(mock(ChatResponseMetadata.class));
        when(chatResponse.getMetadata().getUsage()).thenReturn(mock(Usage.class));
        when(chatModel.call(any(Prompt.class))).thenReturn(chatResponse);
    }
}
