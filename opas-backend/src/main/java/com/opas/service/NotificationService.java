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
        return pushTokenRepository.findByUserId(userId);
    }

    public void sendToUser(java.util.UUID userId, String title, String body) {
        sendToTokens(pushTokenRepository.findByUserId(userId), title, body, Map.of());
    }

    /** {@code data} rides along to the app, e.g. {@code documentId} so a tap opens it. */
    public void sendToUser(java.util.UUID userId, String title, String body, Map<String, String> data) {
        sendToTokens(pushTokenRepository.findByUserId(userId), title, body, data);
    }

    public void sendToAllUsers(String title, String body) {
        List<PushToken> allTokens = pushTokenRepository.findAll();
        sendToTokens(allTokens, title, body, Map.of());
    }

    private void sendToTokens(List<PushToken> tokens, String title, String body, Map<String, String> data) {
        for (PushToken token : tokens) {
            try {
                Map<String, Object> payload = Map.of(
                        "to", token.getToken(),
                        "sound", "default",
                        "title", title,
                        "body", body,
                        "data", data,
                        "priority", "high");
                @SuppressWarnings("unchecked")
                Map<String, Object> response = restClient.post()
                        .uri(EXPO_PUSH_URL)
                        .header("Content-Type", "application/json")
                        .header("Accept", "application/json")
                        .body(payload)
                        .retrieve()
                        .body(Map.class);
                if (isDeviceNotRegistered(response)) {
                    // Expo says this device uninstalled the app. Drop the token so we
                    // stop paying to push to a dead endpoint on every future send.
                    pushTokenRepository.deleteByToken(token.getToken());
                    log.info("Removed unregistered push token");
                }
            } catch (Exception e) {
                log.warn("Failed to send push to token {}: {}", token.getToken(), e.getMessage());
            }
        }
    }

    @SuppressWarnings("unchecked")
    private static boolean isDeviceNotRegistered(Map<String, Object> response) {
        if (response == null) {
            return false;
        }
        Object data = response.get("data");
        if (!(data instanceof List<?> list) || list.isEmpty()) {
            return false;
        }
        Object first = list.get(0);
        if (!(first instanceof Map<?, ?> ticket)) {
            return false;
        }
        if (!"error".equals(ticket.get("status"))) {
            return false;
        }
        Object details = ticket.get("details");
        return details instanceof Map<?, ?> d && "DeviceNotRegistered".equals(d.get("error"));
    }
}
