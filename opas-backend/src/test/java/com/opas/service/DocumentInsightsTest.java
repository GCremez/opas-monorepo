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

    @Test
    void keyFigurePrefersAnAmountOverOtherFields() {
        // jsonb reorders keys (shorter first), so the amount isn't necessarily first.
        var result = insights.from("{\"keyFields\": {\"Period\": \"1.11.2026–31.10.2027\", \"Housing allowance\": \"€387.20/mo\"}}");
        assertEquals("€387.20/mo", result.keyFigure());
        assertEquals("21.5 %", insights.from("{\"keyFields\": {\"Year\": \"2025\", \"Withholding\": \"21.5 %\"}}").keyFigure());
        // No amount or percentage: no headline, rather than whatever value comes first.
        assertNull(insights.from("{\"keyFields\": {\"Year\": \"2025\", \"Permit type\": \"Permanent (P)\"}}").keyFigure());
    }

    @Test
    void caseReferenceComesFromTheFieldThenFromCaseLikeKeyFields() {
        assertEquals("KELA/1234/2026", insights.from("""
                {"caseReference": " KELA/1234/2026 ", "keyFields": {"Dnro": "999"}}""").caseReference());
        // Letters explained before the prompt asked for it: a case-like key field.
        assertEquals("MIG-2026-55", insights.from("""
                {"keyFields": {"Amount": "€10", "Hakemusnumero": "MIG-2026-55"}}""").caseReference());
        assertEquals("4711/2026", insights.from("""
                {"keyFields": {"Ärendenummer": "4711/2026"}}""").caseReference());
        // Payment references and decision numbers change per letter: never a case.
        assertNull(insights.from("""
                {"keyFields": {"Viitenumero": "1234 5678", "Päätösnumero": "77"}}""").caseReference());
    }

    @Test
    void issuedDateOnlyWhenItIsARealDate() {
        assertEquals("2026-10-02", insights.from("{\"issuedDate\": \"2026-10-02\"}").issuedDate());
        assertNull(insights.from("{\"issuedDate\": \"2.10.2026\"}").issuedDate());
    }
}
