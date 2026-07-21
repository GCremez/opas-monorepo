package com.opas.service;

import com.opas.domain.Document;
import com.opas.repository.DocumentRepository;
import com.opas.repository.PushTokenRepository;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
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
    @Transactional(readOnly = true)
    public void remindUndecodedDocuments() {
        Instant cutoff = Instant.now().minus(Duration.ofHours(24));
        pushTokenRepository.findAll().stream()
                .map(t -> t.getUser().getId())
                .distinct()
                .forEach(userId -> {
                    List<Document> stale = documentRepository.findByUserIdAndStatusNotOrderByCreatedAtDesc(
                            userId, "archived").stream()
                            .filter(d -> "uploaded".equals(d.getStatus()))
                            .filter(d -> d.getCreatedAt().isBefore(cutoff))
                            .toList();
                    if (!stale.isEmpty()) {
                        notificationService.sendToUser(userId,
                                "Pending Documents",
                                "You have " + stale.size() + " document(s) waiting to be decoded.");
                        log.info("Reminded user {} about {} undecoded document(s)", userId, stale.size());
                    }
                });
    }

    @Scheduled(cron = "0 0 10 * * 1")
    @Transactional(readOnly = true)
    public void weeklySummary() {
        pushTokenRepository.findAll().stream()
                .map(t -> t.getUser().getId())
                .distinct()
                .forEach(userId -> {
                    long total = documentRepository.findByUserIdAndStatusNotOrderByCreatedAtDesc(
                            userId, "archived").size();
                    if (total > 0) {
                        notificationService.sendToUser(userId,
                                "Weekly Summary",
                                "You have " + total + " document(s) in your Opas library.");
                    }
                });
    }
}
