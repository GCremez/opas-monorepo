package com.opas.service;

import com.opas.config.ResourceNotFoundException;
import com.opas.domain.Document;
import com.opas.domain.DraftLetter;
import com.opas.domain.Subscription;
import com.opas.domain.User;
import com.opas.dto.DraftLetterRequest;
import com.opas.dto.DraftLetterResponse;
import com.opas.repository.DocumentRepository;
import com.opas.repository.DraftLetterRepository;
import com.opas.repository.SubscriptionRepository;
import com.opas.repository.UserRepository;
import java.util.List;
import java.util.UUID;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.chat.prompt.Prompt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class DraftLetterService {

    private final DocumentRepository documentRepository;
    private final DraftLetterRepository draftLetterRepository;
    private final UserRepository userRepository;
    private final SubscriptionRepository subscriptionRepository;
    private final StorageService storageService;
    private final ChatModel chatModel;

    public DraftLetterService(DocumentRepository documentRepository,
            DraftLetterRepository draftLetterRepository, UserRepository userRepository,
            SubscriptionRepository subscriptionRepository, StorageService storageService,
            ChatModel chatModel) {
        this.documentRepository = documentRepository;
        this.draftLetterRepository = draftLetterRepository;
        this.userRepository = userRepository;
        this.subscriptionRepository = subscriptionRepository;
        this.storageService = storageService;
        this.chatModel = chatModel;
    }

    @Transactional(readOnly = true)
    public List<DraftLetterResponse> listDraftLetters(UUID userId, UUID documentId) {
        Document document = documentRepository.findById(documentId)
                .orElseThrow(ResourceNotFoundException::new);
        if (!document.getUser().getId().equals(userId)) {
            throw new ResourceNotFoundException();
        }
        return draftLetterRepository.findByDocumentIdOrderByCreatedAtDesc(documentId).stream()
                .map(this::toResponse).toList();
    }

    @Transactional
    public DraftLetterResponse generateDraft(UUID userId, UUID documentId, DraftLetterRequest request) {
        Document document = documentRepository.findById(documentId)
                .orElseThrow(ResourceNotFoundException::new);
        if (!document.getUser().getId().equals(userId)) {
            throw new ResourceNotFoundException();
        }

        boolean isPremium = subscriptionRepository.findByUserId(userId)
                .map(Subscription::getTier).filter("premium"::equals).isPresent();
        if (!isPremium) {
            throw new IllegalArgumentException("Premium subscription required to generate draft letters");
        }

        User user = userRepository.getReferenceById(userId);

        byte[] fileBytes = storageService.getObjectBytes(document.getS3Key());
        String content = new String(fileBytes, java.nio.charset.StandardCharsets.UTF_8);

        String prompt = buildPrompt(document.getFilename(), content, request.tone(), request.includeOriginal());
        var chatResponse = chatModel.call(new Prompt(prompt));
        String generatedText = chatResponse.getResult() != null
                ? chatResponse.getResult().getOutput().getText()
                : "";

        DraftLetter draft = new DraftLetter();
        draft.setDocument(document);
        draft.setUser(user);
        draft.setContent(generatedText);
        draft.setTone(request.tone());
        draft = draftLetterRepository.save(draft);

        return toResponse(draft);
    }

    private static String buildPrompt(String filename, String content, String tone, boolean includeOriginal) {
        return """
                You are an AI legal assistant helping users draft appeal letters or formal replies to government agency decisions.

                Document filename: %s

                Document content:
                %s

                Tone: %s

                %s

                Write a formal appeal letter or reply in the same language as the document. The letter should:
                - Be addressed to the relevant agency
                - Reference the document case/decision number
                - Present a clear argument for why the decision should be reconsidered
                - Include a polite closing and space for signature
                - Use %s language appropriate for formal correspondence

                Return only the letter body with salutation, body paragraphs, and closing.
                """.formatted(filename, content, tone,
                        includeOriginal
                                ? "Reference specific facts and findings from the document to support the argument."
                                : "Do not quote the document directly, but use the general context to inform the argument.",
                        "formal");
    }

    private DraftLetterResponse toResponse(DraftLetter draft) {
        return new DraftLetterResponse(draft.getId(), draft.getDocument().getId(),
                draft.getContent(), draft.getTone(), draft.getCreatedAt());
    }
}
