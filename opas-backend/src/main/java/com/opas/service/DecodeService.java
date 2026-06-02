package com.opas.service;

import com.opas.domain.DecodeResult;
import com.opas.domain.Document;
import com.opas.domain.Subscription;
import com.opas.domain.User;
import com.opas.dto.DecodeRequest;
import com.opas.dto.DecodeResponse;
import com.opas.repository.DecodeResultRepository;
import com.opas.repository.DocumentRepository;
import com.opas.repository.SubscriptionRepository;
import com.opas.repository.UserRepository;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.UUID;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.chat.prompt.Prompt;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class DecodeService {

    private final DocumentRepository documentRepository;
    private final UserRepository userRepository;
    private final DecodeResultRepository decodeResultRepository;
    private final SubscriptionRepository subscriptionRepository;
    private final StorageService storageService;
    private final PresidioService presidioService;
    private final UsageTracker usageTracker;
    private final ChatModel chatModel;
    private final int freeTierLimit;
    private final String modelName;

    public DecodeService(DocumentRepository documentRepository, UserRepository userRepository,
            DecodeResultRepository decodeResultRepository, SubscriptionRepository subscriptionRepository,
            StorageService storageService, PresidioService presidioService, UsageTracker usageTracker,
            ChatModel chatModel, @Value("${opas.free-tier.monthly-decode-limit}") int freeTierLimit,
            @Value("${spring.ai.anthropic.chat.options.model}") String modelName) {
        this.documentRepository = documentRepository;
        this.userRepository = userRepository;
        this.decodeResultRepository = decodeResultRepository;
        this.subscriptionRepository = subscriptionRepository;
        this.storageService = storageService;
        this.presidioService = presidioService;
        this.usageTracker = usageTracker;
        this.chatModel = chatModel;
        this.freeTierLimit = freeTierLimit;
        this.modelName = modelName;
    }

    @Transactional
    public DecodeResponse decode(UUID userId, UUID documentId, DecodeRequest request) {
        Document document = documentRepository.findById(documentId)
                .orElseThrow(() -> new IllegalArgumentException("Document not found"));
        if (!document.getUser().getId().equals(userId)) {
            throw new IllegalArgumentException("Document does not belong to user");
        }
        if (!"uploaded".equals(document.getStatus())) {
            throw new IllegalArgumentException("Document is not ready for decoding");
        }

        User user = userRepository.getReferenceById(userId);
        int limit = resolveLimit(userId);
        String action = "decodes";

        long remaining = usageTracker.getRemaining(userId.toString(), action, limit);
        if (remaining <= 0) {
            throw new IllegalArgumentException("Monthly decode limit reached");
        }

        byte[] fileBytes = storageService.getObjectBytes(document.getS3Key());
        String content = new String(fileBytes, StandardCharsets.UTF_8);

        if (request.scrubPii()) {
            content = presidioService.scrubPii(content);
        }

        Instant startedAt = Instant.now();
        Prompt prompt = new Prompt(buildDecodePrompt(document.getFilename(), content));
        var chatResponse = chatModel.call(prompt);
        Instant completedAt = Instant.now();

        String rawText = chatResponse.getResult() != null ? chatResponse.getResult().getOutput().getText() : "";
        var metadata = chatResponse.getMetadata();
        var usage = metadata != null ? metadata.getUsage() : null;
        Integer tokensIn = usage != null ? usage.getPromptTokens() : null;
        Integer tokensOut = usage != null ? usage.getCompletionTokens() : null;

        DecodeResult result = new DecodeResult();
        result.setDocument(document);
        result.setUser(user);
        result.setRawResponse(rawText);
        result.setPiiScrubbed(request.scrubPii());
        result.setModel(modelName);
        result.setTokensIn(tokensIn);
        result.setTokensOut(tokensOut);
        result.setStartedAt(startedAt);
        result.setCompletedAt(completedAt);
        result = decodeResultRepository.save(result);

        document.setStatus("ready");
        documentRepository.save(document);

        usageTracker.increment(userId.toString(), action);

        return toResponse(result);
    }

    private int resolveLimit(UUID userId) {
        return subscriptionRepository.findByUserId(userId).map(Subscription::getTier).filter("premium"::equals)
                .map(tier -> Integer.MAX_VALUE).orElse(freeTierLimit);
    }

    private static String buildDecodePrompt(String filename, String content) {
        return """
                You are an AI document analysis assistant. Analyze the following document and extract structured information.

                Filename: %s

                Content:
                %s

                Provide a comprehensive analysis including:
                - Document type
                - Key fields and values
                - Summary of the content
                - Any important dates, names, or identifiers
                - Language of the document

                Return the response as a JSON object with fields: documentType, summary, keyFields, language.
                """
                .formatted(filename, content);
    }

    private static DecodeResponse toResponse(DecodeResult result) {
        return new DecodeResponse(result.getId(), result.getDocument().getId(), result.getRawResponse(),
                result.getStructuredData(), result.isPiiScrubbed(), result.getModel(),
                result.getTokensIn() != null ? result.getTokensIn() : 0,
                result.getTokensOut() != null ? result.getTokensOut() : 0,
                result.getStartedAt() != null && result.getCompletedAt() != null
                        ? Duration.between(result.getStartedAt(), result.getCompletedAt()).toMillis() : 0,
                result.getCreatedAt());
    }
}
