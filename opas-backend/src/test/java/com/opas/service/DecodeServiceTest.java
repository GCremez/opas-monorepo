package com.opas.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.opas.domain.DecodeResult;
import com.opas.domain.Document;
import com.opas.domain.Subscription;
import com.opas.domain.User;
import com.opas.dto.DecodeRequest;
import com.opas.dto.DecodeResponse;
import com.opas.repository.DecodeResultRepository;
import com.opas.repository.DocumentRepository;
import com.opas.repository.SubscriptionRepository;
import com.opas.repository.UserRepository;
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
                storageService, presidioService, usageTracker, chatModel, 5);
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
    void decodeSucceeds() {
        when(documentRepository.findById(documentId)).thenReturn(Optional.of(document));
        when(userRepository.getReferenceById(userId)).thenReturn(user);
        when(storageService.getObjectBytes(anyString())).thenReturn("file content".getBytes());
        when(presidioService.scrubPii(anyString())).thenReturn("scrubbed content");
        when(subscriptionRepository.findByUserId(userId)).thenReturn(Optional.empty());
        when(usageTracker.getRemaining(eq(userId.toString()), eq("decodes"), eq(5))).thenReturn(3L);

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

        DecodeResponse response = service.decode(userId, documentId, new DecodeRequest(true));

        assertNotNull(response);
        assertEquals(documentId, response.documentId());
        verify(usageTracker).increment(userId.toString(), "decodes");
        verify(documentRepository).save(document);
        assertEquals("ready", document.getStatus());
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

    @Test
    void decodeThrowsWhenDocumentNotFound() {
        when(documentRepository.findById(documentId)).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class,
                () -> service.decode(userId, documentId, new DecodeRequest(false)));
    }

    @Test
    void decodeThrowsWhenNotOwner() {
        UUID otherUserId = UUID.randomUUID();
        when(documentRepository.findById(documentId)).thenReturn(Optional.of(document));

        assertThrows(IllegalArgumentException.class,
                () -> service.decode(otherUserId, documentId, new DecodeRequest(false)));
    }

    @Test
    void decodeThrowsWhenNotUploaded() {
        document.setStatus("pending");
        when(documentRepository.findById(documentId)).thenReturn(Optional.of(document));

        assertThrows(IllegalArgumentException.class,
                () -> service.decode(userId, documentId, new DecodeRequest(false)));
    }

    @Test
    void decodeThrowsWhenMonthlyLimitReached() {
        when(documentRepository.findById(documentId)).thenReturn(Optional.of(document));
        when(userRepository.getReferenceById(userId)).thenReturn(user);
        when(subscriptionRepository.findByUserId(userId)).thenReturn(Optional.empty());
        when(usageTracker.getRemaining(eq(userId.toString()), eq("decodes"), eq(5))).thenReturn(0L);

        assertThrows(IllegalArgumentException.class,
                () -> service.decode(userId, documentId, new DecodeRequest(false)));
    }

    @Test
    void decodeSkipsPiiScrubWhenFlagFalse() {
        when(documentRepository.findById(documentId)).thenReturn(Optional.of(document));
        when(userRepository.getReferenceById(userId)).thenReturn(user);
        when(storageService.getObjectBytes(anyString())).thenReturn("file content".getBytes());
        when(subscriptionRepository.findByUserId(userId)).thenReturn(Optional.empty());
        when(usageTracker.getRemaining(eq(userId.toString()), eq("decodes"), eq(5))).thenReturn(3L);

        mockChatModel();

        when(decodeResultRepository.save(any())).thenAnswer(invocation -> {
            DecodeResult r = invocation.getArgument(0);
            r.setId(UUID.randomUUID());
            return r;
        });

        service.decode(userId, documentId, new DecodeRequest(false));

        verify(presidioService, never()).scrubPii(anyString());
    }

    @Test
    void premiumUsersBypassFreeTierLimit() {
        when(documentRepository.findById(documentId)).thenReturn(Optional.of(document));
        when(userRepository.getReferenceById(userId)).thenReturn(user);
        when(storageService.getObjectBytes(anyString())).thenReturn("file content".getBytes());
        Subscription sub = new Subscription();
        sub.setTier("premium");
        when(subscriptionRepository.findByUserId(userId)).thenReturn(Optional.of(sub));
        when(usageTracker.getRemaining(eq(userId.toString()), eq("decodes"), eq(Integer.MAX_VALUE)))
                .thenReturn(Integer.MAX_VALUE - 1L);

        mockChatModel();

        when(decodeResultRepository.save(any())).thenAnswer(invocation -> {
            DecodeResult r = invocation.getArgument(0);
            r.setId(UUID.randomUUID());
            return r;
        });

        DecodeResponse response = service.decode(userId, documentId, new DecodeRequest(false));

        assertNotNull(response);
        verify(usageTracker).getRemaining(eq(userId.toString()), eq("decodes"), eq(Integer.MAX_VALUE));
    }
}
