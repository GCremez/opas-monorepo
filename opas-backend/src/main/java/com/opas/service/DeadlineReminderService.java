package com.opas.service;

import com.opas.repository.DocumentRepository;
import com.opas.repository.PushTokenRepository;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
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

    public DeadlineReminderService(DocumentRepository documentRepository,
            PushTokenRepository pushTokenRepository, NotificationService notificationService) {
        this.documentRepository = documentRepository;
        this.pushTokenRepository = pushTokenRepository;
        this.notificationService = notificationService;
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
                notificationService.sendToUser(userId,
                        "Pending Documents",
                        "You have " + stale + " document(s) waiting to be decoded.");
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
                notificationService.sendToUser(userId,
                        "Weekly Summary",
                        "You have " + total + " document(s) in your Opas library.");
            }
        }
    }
}
