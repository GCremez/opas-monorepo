package com.opas.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.opas.domain.User;
import com.opas.repository.DocumentRepository;
import com.opas.repository.PushTokenRepository;
import com.opas.repository.UserRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class DeadlineReminderServiceTest {

    @Mock
    private DocumentRepository documentRepository;
    @Mock
    private PushTokenRepository pushTokenRepository;
    @Mock
    private NotificationService notificationService;
    @Mock
    private UserRepository userRepository;
    @InjectMocks
    private DeadlineReminderService service;

    private UUID userIn(String language) {
        UUID id = UUID.randomUUID();
        User user = new User();
        user.setId(id);
        user.setLanguage(language);
        when(userRepository.findById(id)).thenReturn(Optional.of(user));
        return id;
    }

    @Test
    void pendingReminderIsInTheUsersLanguage() {
        UUID fi = userIn("fi");
        UUID sv = userIn("sv");
        when(pushTokenRepository.findDistinctUserIds()).thenReturn(List.of(fi, sv));
        when(documentRepository.countByUserIdAndStatusAndCreatedAtBefore(eq(fi), eq("uploaded"), any())).thenReturn(3L);
        when(documentRepository.countByUserIdAndStatusAndCreatedAtBefore(eq(sv), eq("uploaded"), any())).thenReturn(1L);

        service.remindUndecodedDocuments();

        verify(notificationService).sendToUser(fi, "Kirjeitä odottaa", "Sinulla on 3 kirjettä, joita ei ole vielä luettu.");
        verify(notificationService).sendToUser(sv, "Brev väntar", "Du har 1 brev som inte har lästs än.");
    }

    @Test
    void weeklySummaryFallsBackToEnglish() {
        UUID other = userIn("de");
        when(pushTokenRepository.findDistinctUserIds()).thenReturn(List.of(other));
        when(documentRepository.countByUserIdAndStatusNot(other, "archived")).thenReturn(1L);

        service.weeklySummary();

        verify(notificationService).sendToUser(other, "Your week in Opas", "You have 1 letter in Opas.");
    }

    @Test
    void everyLanguageHasBothNotifications() {
        for (String lang : List.of("en", "fi", "sv")) {
            assertNotNull(DeadlineReminderService.PENDING.get(lang), lang);
            assertNotNull(DeadlineReminderService.WEEKLY.get(lang), lang);
            assertTrue(DeadlineReminderService.PENDING.get(lang).many().contains("%d"), lang);
            assertTrue(DeadlineReminderService.WEEKLY.get(lang).many().contains("%d"), lang);
        }
    }
}
