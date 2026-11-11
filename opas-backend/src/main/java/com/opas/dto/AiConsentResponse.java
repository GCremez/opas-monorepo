package com.opas.dto;

import com.opas.domain.User;
import java.time.Instant;
import org.springframework.lang.Nullable;

/** Which version of the AI consent screen the person agreed to, and when. */
public record AiConsentResponse(String version, Instant grantedAt) {

    /** Null when the person has never agreed. */
    @Nullable
    public static AiConsentResponse of(User user) {
        return user.getAiConsentVersion() == null ? null
                : new AiConsentResponse(user.getAiConsentVersion(), user.getAiConsentAt());
    }
}
