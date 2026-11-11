package com.opas.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.opas.dto.DocumentDeadline;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.regex.Pattern;
import org.springframework.lang.Nullable;
import org.springframework.stereotype.Component;

/**
 * Pulls the list-level facts (title, authority, stated deadlines, the headline figure and
 * the text that search matches against) out of a decode's
 * structured JSON so document lists can show them without every client re-parsing the
 * whole decode. The JSON is model output: anything malformed is dropped, never thrown.
 */
@Component
public class DocumentInsights {

    /**
     * @param keyFigure the letter's headline amount or percentage, shown next to it in lists;
     *     null when it has none (the list then shows the status instead)
     */
    public record Insights(@Nullable String title, @Nullable String authority, List<DocumentDeadline> deadlines,
            @Nullable String documentType, @Nullable String summary, List<String> actions,
            @Nullable String keyFigure, @Nullable String caseReference, @Nullable String issuedDate) {
        static final Insights EMPTY = new Insights(null, null, List.of(), null, null, List.of(), null, null, null);
    }

    /**
     * Key-field labels that name the sender's case or file number, for letters explained
     * before the prompt asked for caseReference. Payment references (viitenumero), invoice
     * and decision numbers change from letter to letter, so they never make a case.
     */
    private static final Pattern CASE_LABEL = Pattern.compile(
            "diaari|\\bdnro\\b|\\bdnr\\b|asianumero|asiatunnus|ärende|diarienummer|hakemusnumero"
                    + "|case (number|reference|no)|file (number|reference)|application (number|no)",
            Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE);

    private static final Pattern MONEY_OR_PERCENT =
            Pattern.compile("[€$£%]|\\b(EUR|euroa?)\\b", Pattern.CASE_INSENSITIVE);

    private final ObjectMapper objectMapper;

    public DocumentInsights(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public Insights from(@Nullable String structuredData) {
        if (structuredData == null || structuredData.isBlank()) {
            return Insights.EMPTY;
        }
        JsonNode root;
        try {
            root = objectMapper.readTree(structuredData);
        } catch (Exception e) {
            return Insights.EMPTY;
        }
        if (root == null || !root.isObject()) {
            return Insights.EMPTY;
        }
        List<DocumentDeadline> deadlines = new ArrayList<>();
        JsonNode list = root.path("deadlines");
        if (list.isArray()) {
            for (JsonNode item : list) {
                String date = text(item.path("date"));
                if (date != null && isIsoDate(date)) {
                    String description = text(item.path("description"));
                    deadlines.add(new DocumentDeadline(date, description != null ? description : ""));
                }
            }
        }
        deadlines.sort(Comparator.comparing(DocumentDeadline::date));
        List<String> actions = new ArrayList<>();
        if (root.path("actions").isArray()) {
            for (JsonNode item : root.path("actions")) {
                String action = text(item);
                if (action != null) {
                    actions.add(action);
                }
            }
        }
        // jsonb doesn't keep the model's key order, so "first" means nothing on its own:
        // only an amount or a percentage makes a headline. Anything else (a permit type,
        // an application number) read as noise next to the title.
        String keyFigure = null;
        JsonNode keyFields = root.path("keyFields");
        if (keyFields.isObject()) {
            List<String> values = new ArrayList<>();
            keyFields.elements().forEachRemaining(v -> {
                String value = v.isNumber() ? v.asText() : text(v);
                if (value != null) {
                    values.add(value);
                }
            });
            keyFigure = values.stream().filter(v -> MONEY_OR_PERCENT.matcher(v).find()).findFirst()
                    .orElse(null);
        }
        String caseReference = text(root.path("caseReference"));
        if (caseReference == null && keyFields.isObject()) {
            var fields = keyFields.fields();
            while (caseReference == null && fields.hasNext()) {
                var field = fields.next();
                if (CASE_LABEL.matcher(field.getKey()).find()) {
                    caseReference = field.getValue().isNumber() ? field.getValue().asText() : text(field.getValue());
                }
            }
        }
        String issued = text(root.path("issuedDate"));
        return new Insights(text(root.path("title")), text(root.path("authority")), List.copyOf(deadlines),
                text(root.path("documentType")), text(root.path("summary")), List.copyOf(actions), keyFigure,
                caseReference, issued != null && isIsoDate(issued) ? issued : null);
    }

    @Nullable
    private static String text(JsonNode node) {
        return node.isTextual() && !node.asText().isBlank() ? node.asText().trim() : null;
    }

    private static boolean isIsoDate(String value) {
        try {
            LocalDate.parse(value);
            return value.length() == 10;
        } catch (DateTimeParseException e) {
            return false;
        }
    }
}
