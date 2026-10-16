package com.opas.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.opas.dto.DocumentDeadline;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import org.springframework.lang.Nullable;
import org.springframework.stereotype.Component;

/**
 * Pulls the list-level facts (title, authority, stated deadlines) out of a decode's
 * structured JSON so document lists can show them without every client re-parsing the
 * whole decode. The JSON is model output: anything malformed is dropped, never thrown.
 */
@Component
public class DocumentInsights {

    public record Insights(@Nullable String title, @Nullable String authority, List<DocumentDeadline> deadlines) {
        static final Insights EMPTY = new Insights(null, null, List.of());
    }

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
        return new Insights(text(root.path("title")), text(root.path("authority")), List.copyOf(deadlines));
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
