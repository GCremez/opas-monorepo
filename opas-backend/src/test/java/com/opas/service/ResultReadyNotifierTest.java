package com.opas.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.opas.domain.Document;
import com.opas.domain.User;
import com.opas.repository.DocumentRepository;
import com.opas.repository.UserRepository;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.SimpleTransactionStatus;
import org.springframework.transaction.support.TransactionTemplate;

class ResultReadyNotifierTest {

    private final NotificationService push = mock(NotificationService.class);
    private final EmailService email = mock(EmailService.class);
    private final DocumentRepository documents = mock(DocumentRepository.class);
    private final UserRepository users = mock(UserRepository.class);
    private ResultReadyNotifier notifier;
    private User user;
    private UUID documentId;

    @BeforeEach
    void setUp() {
        PlatformTransactionManager txm = mock(PlatformTransactionManager.class);
        when(txm.getTransaction(any())).thenReturn(new SimpleTransactionStatus());
        notifier = new ResultReadyNotifier(push, email, documents, users, new TransactionTemplate(txm),
                Duration.ofMinutes(10), "https://opas.app/");
        user = new User();
        user.setId(UUID.randomUUID());
        user.setEmail("a@b.fi");
        user.setLanguage("sv");
        documentId = UUID.randomUUID();
    }

    @Test
    void pushIsInTheUsersLanguageAndOpensTheDocument() {
        when(users.findById(user.getId())).thenReturn(Optional.of(user));

        notifier.onDecodeReady(new DecodeReadyEvent(user.getId(), documentId));

        verify(push).sendToUser(user.getId(), "Ditt brev är klart",
                "Tryck för att se vad det står och vad du ska göra.",
                Map.of("documentId", documentId.toString(), "type", "decode_ready"));
    }

    @Test
    void unopenedResultIsEmailedOnceWithALinkToIt() {
        Document doc = new Document();
        doc.setId(documentId);
        doc.setUser(user);
        when(documents.findUnseenReadyIds(any(), any())).thenReturn(List.of(documentId));
        when(documents.claimReadyEmail(eq(documentId), any())).thenReturn(1);
        when(documents.findById(documentId)).thenReturn(Optional.of(doc));

        notifier.emailUnseenResults();

        verify(email).sendResultReady("a@b.fi", "https://opas.app/d/" + documentId, "sv");
    }

    @Test
    void noEmailWhenTheResultWasOpenedOrAlreadyEmailed() {
        when(documents.findUnseenReadyIds(any(), any())).thenReturn(List.of(documentId));
        when(documents.claimReadyEmail(eq(documentId), any())).thenReturn(0);

        notifier.emailUnseenResults();

        verifyNoInteractions(email);
    }

    @Test
    void aFailedPushNeverFailsTheDecode() {
        when(users.findById(any())).thenThrow(new IllegalStateException("db down"));
        assertDoesNotThrow(() -> notifier.onDecodeReady(new DecodeReadyEvent(user.getId(), documentId)));
    }
}
