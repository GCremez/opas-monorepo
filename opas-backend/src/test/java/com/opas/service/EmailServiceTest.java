package com.opas.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import software.amazon.awssdk.services.sesv2.SesV2Client;
import software.amazon.awssdk.services.sesv2.model.SendEmailRequest;

class EmailServiceTest {

    private final SesV2Client ses = mock(SesV2Client.class);
    private final EmailService enabled = new EmailService(ses, true, "no-reply@opas.fi");

    private SendEmailRequest sent() {
        var captor = ArgumentCaptor.forClass(SendEmailRequest.class);
        verify(ses).sendEmail(captor.capture());
        return captor.getValue();
    }

    @Test
    void verificationEmailIsSentInTheUsersLanguage() {
        enabled.sendVerificationCode("a@b.fi", "482913", "fi");

        var message = sent().content().simple();
        assertEquals("482913 on Opas-vahvistuskoodisi", message.subject().data());
        String html = message.body().html().data();
        assertTrue(html.contains("<html lang=\"fi\">"));
        assertTrue(html.contains("Vahvista sähköpostiosoitteesi"));
        assertTrue(html.contains("482913"));
        assertTrue(message.body().text().data().contains("482913"));
    }

    @Test
    void unknownOrMissingLanguageFallsBackToEnglish() {
        enabled.sendPasswordResetCode("a@b.fi", "111222", "de");
        assertTrue(sent().content().simple().subject().data().startsWith("111222 is your Opas password reset code"));

        assertEquals("en", EmailService.copyFor(EmailService.VERIFICATION, null).lang());
    }

    @Test
    void templateUsesThePaperPaletteNotTheOldMintBrand() {
        String html = EmailService.html(EmailService.copyFor(EmailService.PASSWORD_RESET, "sv"), "000000");

        assertTrue(html.contains("#35503f"), "pine accent");
        assertTrue(html.contains("#f2ede2"), "paper background");
        assertFalse(html.contains("#92d9bb"), "old mint accent");
        assertFalse(html.contains("#eef8f2"), "old mint code box");
        assertFalse(html.matches("(?s).*%(\\d+\\$)?s.*"), "no unformatted placeholders");
    }

    @Test
    void disabledMailNeverCallsSes() {
        new EmailService(ses, false, "no-reply@opas.fi").sendVerificationCode("a@b.fi", "123456", "en");
        verify(ses, never()).sendEmail(any(SendEmailRequest.class));
    }

    @Test
    void resultReadyEmailHasAButtonToTheLetterAndNothingFromIt() {
        String link = "https://opas.app/d/25c4f7a2-71b9-4e81-92af-3a3ae5fd7b3a";
        enabled.sendResultReady("a@b.fi", link, "fi");

        var message = sent().content().simple();
        assertEquals("Kirjeesi on valmis Opaksessa", message.subject().data());
        String html = message.body().html().data();
        assertTrue(html.contains("<html lang=\"fi\">"));
        assertTrue(html.contains("href=\"" + link + "\""), "button links to the result");
        assertTrue(html.contains("Avaa Opaksessa"));
        assertFalse(html.matches("(?s).*%(\\d+\\$)?s.*"), "no unformatted placeholders");
        assertTrue(message.body().text().data().contains(link), "plain-text part carries the link too");
    }
}
