package com.opas.service;

import static org.junit.jupiter.api.Assertions.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.opas.dto.DocumentDeadline;
import java.util.List;
import org.junit.jupiter.api.Test;

class DocumentInsightsTest {

    private final DocumentInsights insights = new DocumentInsights(new ObjectMapper());

    @Test
    void extractsTitleAuthorityAndSortedDeadlines() {
        var result = insights.from("""
                {"title": "Housing allowance approved", "authority": "Kela",
                 "deadlines": [{"date": "2026-05-01", "description": "Send payslips"},
                               {"date": "2026-04-14", "description": "Appeal"}]}""");

        assertEquals("Housing allowance approved", result.title());
        assertEquals("Kela", result.authority());
        assertEquals(List.of(new DocumentDeadline("2026-04-14", "Appeal"),
                new DocumentDeadline("2026-05-01", "Send payslips")), result.deadlines());
    }

    @Test
    void dropsMalformedDeadlines() {
        var result = insights.from("""
                {"title": 7, "deadlines": [{"date": "2026-02-31"}, {"date": "14.4.2026"}, "x",
                                           {"date": "2026-04-14"}]}""");

        assertNull(result.title());
        assertEquals(List.of(new DocumentDeadline("2026-04-14", "")), result.deadlines());
    }

    @Test
    void toleratesMissingOrInvalidJson() {
        assertEquals(List.of(), insights.from(null).deadlines());
        assertEquals(List.of(), insights.from("not json").deadlines());
        assertEquals(List.of(), insights.from("[1,2]").deadlines());
    }

    @Test
    void extractsWhatListsAndSearchShow() {
        var result = insights.from("""
                {"documentType": "Päätös asumistuesta", "summary": "Your housing allowance is approved.",
                 "actions": ["Report income changes", 3, " "],
                 "keyFields": {"Amount": "€387.20/mo", "Valid from": "2026-04-01"}}
                """);
        assertEquals("Päätös asumistuesta", result.documentType());
        assertEquals("Your housing allowance is approved.", result.summary());
        assertEquals(List.of("Report income changes"), result.actions());
        assertEquals("€387.20/mo", result.keyFigure());
    }

    @Test
    void keyFigureIsNullWithoutKeyFields() {
        assertNull(insights.from("{\"keyFields\": {}}").keyFigure());
        assertNull(insights.from("{\"title\": \"x\"}").keyFigure());
    }
}
