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
        pushTokenRepository.deleteByUserIdAndToken(userId, request.token());

        User user = userRepository.getReferenceById(userId);
        PushToken token = new PushToken();
        token.setUser(user);
        token.setToken(request.token());
        token.setPlatform(request.platform());
        pushTokenRepository.save(token);
    }
}
