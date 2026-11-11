package com.opas.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.opas.domain.Document;
import com.opas.domain.DraftLetter;
import com.opas.domain.Subscription;
import com.opas.domain.User;
import com.opas.dto.DraftLetterRequest;
import com.opas.repository.DocumentRepository;
import com.opas.repository.DraftLetterRepository;
import com.opas.repository.SubscriptionRepository;
import com.opas.repository.UserRepository;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class DraftLetterServiceTest {

    @Mock
    private DocumentRepository documentRepository;
    @Mock
    private DraftLetterRepository draftLetterRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private SubscriptionRepository subscriptionRepository;
    @Mock
    private StorageService storageService;
    @Mock
    private TextExtractionService textExtractionService;
    @Mock
    private PresidioService presidioService;
    @Mock
    private ClaudeClient claudeClient;

    private UUID userId;
    private UUID documentId;
    private User user;
    private Document document;

    @BeforeEach
    void setUp() {
        userId = UUID.randomUUID();
        user = new User();
        user.setId(userId);
        documentId = UUID.randomUUID();
        document = new Document();
        document.setId(documentId);
        document.setUser(user);
        document.setFilename("kela.pdf");
        document.setContentType("application/pdf");
        document.setS3Key(userId + "/kela.pdf");
    }

    private DraftLetterService service(boolean freeForEveryone) {
        return new DraftLetterService(documentRepository, draftLetterRepository, userRepository,
                subscriptionRepository, storageService, textExtractionService, presidioService,
                claudeClient, freeForEveryone);
    }

    private void premium(boolean isPremium) {
        Subscription s = new Subscription();
        s.setTier(isPremium ? "premium" : "free");
        when(subscriptionRepository.findByUserId(userId)).thenReturn(Optional.of(s));
    }

    @Test
    void draftsIncludedForPremiumOnlyWhenNotFreeForEveryone() {
        premium(true);
        assertTrue(service(false).draftsIncluded(userId));
        premium(false);
        assertFalse(service(false).draftsIncluded(userId));
    }

    @Test
    void draftsIncludedForEveryoneDuringBeta() {
        assertTrue(service(true).draftsIncluded(userId));
        verifyNoInteractions(subscriptionRepository);
    }

    @Test
    void freeUserIsRefusedWhenDraftsArePremiumOnly() {
        premium(false);
        when(documentRepository.findById(documentId)).thenReturn(Optional.of(document));
        assertThrows(IllegalArgumentException.class,
                () -> service(false).generateDraft(userId, documentId, new DraftLetterRequest("formal", true)));
        verifyNoInteractions(claudeClient);
    }

    @Test
    void sendsExtractedRedactedTextNotRawFileBytes() {
        byte[] pdfBytes = "%PDF-1.7 binary".getBytes();
        when(documentRepository.findById(documentId)).thenReturn(Optional.of(document));
        when(storageService.getObjectBytes(document.getS3Key())).thenReturn(pdfBytes);
        when(textExtractionService.extract("application/pdf", pdfBytes))
                .thenReturn("Hei Matti Meikäläinen, 010190-123A, pyydämme lisäselvitystä.");
        when(presidioService.scrubPii(anyString(), anyCollection()))
                .thenReturn("Hei <PERSON>, <FI_PERSONAL_ID>, pyydämme lisäselvitystä.");
        when(claudeClient.complete(anyString())).thenReturn(new ClaudeClient.Reply("Hyvä Kela, ...", "m", 1, 1));
        when(draftLetterRepository.save(any(DraftLetter.class))).thenAnswer(i -> i.getArgument(0));

        service(true).generateDraft(userId, documentId, new DraftLetterRequest("formal", true));

        ArgumentCaptor<String> prompt = ArgumentCaptor.forClass(String.class);
        verify(claudeClient).complete(prompt.capture());
        assertTrue(prompt.getValue().contains("Hei <PERSON>, <FI_PERSONAL_ID>, pyydämme lisäselvitystä."));
        assertFalse(prompt.getValue().contains("Matti"));
        assertFalse(prompt.getValue().contains("010190-123A"));
        assertFalse(prompt.getValue().contains("%PDF"));
    }

    @Test
    void nothingIsSentWhenRedactionIsUnavailable() {
        when(documentRepository.findById(documentId)).thenReturn(Optional.of(document));
        when(storageService.getObjectBytes(any())).thenReturn(new byte[] {1});
        when(textExtractionService.extract(any(), any())).thenReturn("text");
        when(presidioService.scrubPii(anyString(), anyCollection())).thenThrow(new PresidioUnavailableException("down", null));

        assertThrows(PresidioUnavailableException.class,
                () -> service(true).generateDraft(userId, documentId, new DraftLetterRequest("formal", true)));
        verifyNoInteractions(claudeClient);
    }
}
