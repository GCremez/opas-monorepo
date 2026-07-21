package com.opas.service;

import com.opas.domain.PushToken;
import com.opas.repository.PushTokenRepository;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClient;

@Service
public class NotificationService {

    private static final Logger log = LoggerFactory.getLogger(NotificationService.class);
    private static final String EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

    private final PushTokenRepository pushTokenRepository;
    private final RestClient restClient;

    public NotificationService(PushTokenRepository pushTokenRepository, RestClient.Builder restClientBuilder) {
        this.pushTokenRepository = pushTokenRepository;
        this.restClient = restClientBuilder.build();
    }

    @Transactional(readOnly = true)
    public List<PushToken> getTokensForUser(java.util.UUID userId) {
        return pushTokenRepository.findAll().stream()
                .filter(t -> t.getUser().getId().equals(userId))
                .toList();
    }

    public void sendToUser(java.util.UUID userId, String title, String body) {
        List<PushToken> tokens = pushTokenRepository.findAll().stream()
                .filter(t -> t.getUser().getId().equals(userId))
                .toList();
        sendToTokens(tokens, title, body);
    }

    public void sendToAllUsers(String title, String body) {
        List<PushToken> allTokens = pushTokenRepository.findAll();
        sendToTokens(allTokens, title, body);
    }

    private void sendToTokens(List<PushToken> tokens, String title, String body) {
        for (PushToken token : tokens) {
            try {
                Map<String, Object> payload = Map.of(
                        "to", token.getToken(),
                        "sound", "default",
                        "title", title,
                        "body", body,
                        "priority", "high");
                restClient.post()
                        .uri(EXPO_PUSH_URL)
                        .header("Content-Type", "application/json")
                        .header("Accept", "application/json")
                        .body(payload)
                        .retrieve()
                        .toBodilessEntity();
            } catch (Exception e) {
                log.warn("Failed to send push to token {}: {}", token.getToken(), e.getMessage());
            }
        }
    }
}
