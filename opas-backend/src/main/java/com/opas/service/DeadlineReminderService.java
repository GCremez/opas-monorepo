package com.opas.service;

import com.opas.repository.DocumentRepository;
import com.opas.repository.PushTokenRepository;
import com.opas.repository.UserRepository;
import com.opas.domain.User;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import net.javacrumbs.shedlock.spring.annotation.SchedulerLock;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class DeadlineReminderService {

    private static final Logger log = LoggerFactory.getLogger(DeadlineReminderService.class);

    private final DocumentRepository documentRepository;
    private final PushTokenRepository pushTokenRepository;
    private final NotificationService notificationService;
    private final UserRepository userRepository;

    public DeadlineReminderService(DocumentRepository documentRepository,
            PushTokenRepository pushTokenRepository, NotificationService notificationService,
            UserRepository userRepository) {
        this.documentRepository = documentRepository;
        this.pushTokenRepository = pushTokenRepository;
        this.notificationService = notificationService;
        this.userRepository = userRepository;
    }

    /** A push in one language: title, body for one letter, body for several (%d = count). */
    record Copy(String title, String one, String many) {
        String body(long count) {
            return count == 1 ? one : many.formatted(count);
        }
    }

    static final Map<String, Copy> PENDING = Map.of(
            "en", new Copy("Letters waiting", "You have 1 letter waiting to be read.",
                    "You have %d letters waiting to be read."),
            "fi", new Copy("Kirjeitä odottaa", "Sinulla on 1 kirje, jota ei ole vielä luettu.",
                    "Sinulla on %d kirjettä, joita ei ole vielä luettu."),
            "sv", new Copy("Brev väntar", "Du har 1 brev som inte har lästs än.",
                    "Du har %d brev som inte har lästs än."));

    static final Map<String, Copy> WEEKLY = Map.of(
            "en", new Copy("Your week in Opas", "You have 1 letter in Opas.", "You have %d letters in Opas."),
            "fi", new Copy("Viikkokatsaus", "Sinulla on Opasissa 1 kirje.", "Sinulla on Opasissa %d kirjettä."),
            "sv", new Copy("Veckosammanfattning", "Du har 1 brev i Opas.", "Du har %d brev i Opas."));

    static Copy copyFor(Map<String, Copy> copies, String language) {
        return copies.getOrDefault(language == null ? "en" : language, copies.get("en"));
    }

    private String languageOf(UUID userId) {
        return userRepository.findById(userId).map(User::getLanguage).orElse("en");
    }

    @Scheduled(cron = "0 0 9 * * *")
    @SchedulerLock(name = "remindUndecodedDocuments", lockAtLeastFor = "PT1M", lockAtMostFor = "PT10M")
    @Transactional(readOnly = true)
    public void remindUndecodedDocuments() {
        Instant cutoff = Instant.now().minus(Duration.ofHours(24));
        // Iterate the distinct users that have a push token, and use count queries
        // instead of loading each user's whole document list just to size it.
        List<UUID> userIds = pushTokenRepository.findDistinctUserIds();
        for (UUID userId : userIds) {
            long stale = documentRepository.countByUserIdAndStatusAndCreatedAtBefore(userId, "uploaded", cutoff);
            if (stale > 0) {
                Copy copy = copyFor(PENDING, languageOf(userId));
                notificationService.sendToUser(userId, copy.title(), copy.body(stale));
                log.info("Reminded user {} about {} undecoded document(s)", userId, stale);
            }
        }
    }

    @Scheduled(cron = "0 0 10 * * 1")
    @SchedulerLock(name = "weeklySummary", lockAtLeastFor = "PT1M", lockAtMostFor = "PT10M")
    @Transactional(readOnly = true)
    public void weeklySummary() {
        List<UUID> userIds = pushTokenRepository.findDistinctUserIds();
        for (UUID userId : userIds) {
            long total = documentRepository.countByUserIdAndStatusNot(userId, "archived");
            if (total > 0) {
                Copy copy = copyFor(WEEKLY, languageOf(userId));
                notificationService.sendToUser(userId, copy.title(), copy.body(total));
            }
        }
    }
}
