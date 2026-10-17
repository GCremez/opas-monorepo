package com.opas.service;

import com.opas.domain.User;
import com.opas.repository.DocumentRepository;
import com.opas.repository.UserRepository;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import net.javacrumbs.shedlock.spring.annotation.SchedulerLock;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * Tells people their scanned letter has been read, since a decode can take long enough
 * that they've left the app:
 *
 * <ul>
 *   <li>a push the moment the result is saved (the app hides it if it's open), and</li>
 *   <li>an email with a button to the result, only if it's still unopened
 *       {@code opas.notify.ready-email-after} later. That also covers people who never
 *       allowed notifications.</li>
 * </ul>
 *
 * Neither ever says what the letter is about: both can be read on a lock screen.
 */
@Service
public class ResultReadyNotifier {

    private static final Logger log = LoggerFactory.getLogger(ResultReadyNotifier.class);

    /** Results older than this are never emailed about (backlogs, outages). */
    private static final Duration EMAIL_WINDOW = Duration.ofHours(24);

    record PushCopy(String title, String body) {
    }

    static final Map<String, PushCopy> PUSH = Map.of(
            "en", new PushCopy("Your letter is ready", "Tap to see what it says and what to do."),
            "fi", new PushCopy("Kirjeesi on valmis", "Napauta nähdäksesi, mitä siinä sanotaan ja mitä tehdä."),
            "sv", new PushCopy("Ditt brev är klart", "Tryck för att se vad det står och vad du ska göra."));

    /** Marks the push so the app can tell it apart from deadline reminders. */
    static final String PUSH_TYPE = "decode_ready";

    private record Recipient(String email, String language) {
    }

    private final NotificationService notificationService;
    private final EmailService emailService;
    private final DocumentRepository documentRepository;
    private final UserRepository userRepository;
    private final TransactionTemplate tx;
    /** After a commit the finished transaction is still bound to the thread; start a new one. */
    private final TransactionTemplate afterCommitTx;
    private final Duration emailAfter;
    private final String linkBaseUrl;

    public ResultReadyNotifier(NotificationService notificationService, EmailService emailService,
            DocumentRepository documentRepository, UserRepository userRepository, TransactionTemplate tx,
            @Value("${opas.notify.ready-email-after:PT10M}") Duration emailAfter,
            @Value("${opas.links.base-url:https://opas.app}") String linkBaseUrl) {
        this.notificationService = notificationService;
        this.emailService = emailService;
        this.documentRepository = documentRepository;
        this.userRepository = userRepository;
        this.tx = tx;
        this.afterCommitTx = new TransactionTemplate(tx.getTransactionManager());
        this.afterCommitTx.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
        this.afterCommitTx.setReadOnly(true);
        this.emailAfter = emailAfter;
        this.linkBaseUrl = linkBaseUrl.replaceAll("/+$", "");
    }

    /** After the decode commits, so a tap never opens a document that isn't ready yet. */
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onDecodeReady(DecodeReadyEvent event) {
        try {
            String language = afterCommitTx.execute(s -> userRepository.findById(event.userId())
                    .map(User::getLanguage).orElse("en"));
            PushCopy copy = PUSH.getOrDefault(language == null ? "en" : language, PUSH.get("en"));
            notificationService.sendToUser(event.userId(), copy.title(), copy.body(),
                    Map.of("documentId", event.documentId().toString(), "type", PUSH_TYPE));
        } catch (Exception e) {
            // Best effort: the result is saved either way, and the email backup still runs.
            log.warn("Result-ready push failed for document {}: {}", event.documentId(), e.getMessage());
        }
    }

    @Scheduled(fixedDelayString = "${opas.notify.ready-email-poll:PT1M}")
    @SchedulerLock(name = "emailUnseenResults", lockAtLeastFor = "PT10S", lockAtMostFor = "PT5M")
    public void emailUnseenResults() {
        Instant now = Instant.now();
        List<UUID> ids = documentRepository.findUnseenReadyIds(now.minus(emailAfter), now.minus(EMAIL_WINDOW));
        for (UUID id : ids) {
            Recipient to = tx.execute(s -> claim(id));
            if (to == null) {
                continue;
            }
            try {
                emailService.sendResultReady(to.email(), linkBaseUrl + "/d/" + id, to.language());
                log.info("Sent result-ready email for document {}", id);
            } catch (Exception e) {
                // Claimed before sending, so a failure is not retried: one missed email
                // beats a user getting the same one every minute.
                log.warn("Result-ready email failed for document {}: {}", id, e.getMessage());
            }
        }
    }

    /** Marks the email as sent and returns who gets it, or null if someone beat us to it. */
    private Recipient claim(UUID documentId) {
        if (documentRepository.claimReadyEmail(documentId, Instant.now()) != 1) {
            return null;
        }
        return documentRepository.findById(documentId)
                .map(d -> new Recipient(d.getUser().getEmail(), d.getUser().getLanguage()))
                .orElse(null);
    }
}
