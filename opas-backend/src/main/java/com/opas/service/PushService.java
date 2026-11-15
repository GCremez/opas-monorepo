package com.opas.service;

import com.opas.domain.PushToken;
import com.opas.domain.User;
import com.opas.dto.PushTokenRequest;
import com.opas.repository.PushTokenRepository;
import com.opas.repository.UserRepository;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PushService {

    private final PushTokenRepository pushTokenRepository;
    private final UserRepository userRepository;

    public PushService(PushTokenRepository pushTokenRepository, UserRepository userRepository) {
        this.pushTokenRepository = pushTokenRepository;
        this.userRepository = userRepository;
    }

    @Transactional
    public void register(UUID userId, PushTokenRequest request) {
        // A device token belongs to whoever signed in on that device last. Removing it only
        // for this user left the previous account's row in place: the insert then hit the
        // unique index (500), and that account's "letter is ready" pushes kept going to a
        // phone someone else now uses.
        pushTokenRepository.deleteByToken(request.token());
        pushTokenRepository.flush();

        User user = userRepository.getReferenceById(userId);
        PushToken token = new PushToken();
        token.setUser(user);
        token.setToken(request.token());
        token.setPlatform(request.platform());
        pushTokenRepository.save(token);
    }
}
