package com.opas.service;

import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.services.sesv2.SesV2Client;
import software.amazon.awssdk.services.sesv2.model.Body;
import software.amazon.awssdk.services.sesv2.model.Content;
import software.amazon.awssdk.services.sesv2.model.Destination;
import software.amazon.awssdk.services.sesv2.model.EmailContent;
import software.amazon.awssdk.services.sesv2.model.Message;
import software.amazon.awssdk.services.sesv2.model.SendEmailRequest;

/**
 * Sends transactional email via AWS SES v2.
 *
 * <p>When {@code opas.mail.enabled=false} (the default, e.g. local dev where no SES
 * sender identity is configured) email is not sent — the message is logged instead so
 * developers can read the verification code from the application log. In every deployed
 * environment {@code opas.mail.enabled} MUST be true, otherwise the hard verification
 * gate can never be satisfied.
 */
@Service
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);

    private static final String FROM_NAME = "Opas";

    /** Paper palette from the app's design tokens (light only — see {@link #html}). */
    private static final String PAGE = "#f2ede2";
    private static final String CARD = "#fbf9f4";
    private static final String BORDER = "#ddd5c4";
    private static final String INK = "#211e16";
    private static final String INK_SOFT = "#4c473c";
    private static final String MUTED = "#666054";
    private static final String PINE = "#35503f";
    private static final String CODE_BG = "#eae3d3";
    private static final String SERIF = "'Newsreader',Georgia,'Times New Roman',serif";
    private static final String SANS = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
    private static final String MONO = "'JetBrains Mono','SF Mono',SFMono-Regular,Menlo,Consolas,monospace";

    /** All user-facing copy for one email, in one language. */
    record Copy(String lang, String subject, String heading, String intro, String instructions, String ignore,
            String preheader, String tagline, String reason) {
    }

    static final Map<String, Copy> VERIFICATION = Map.of(
            "en", new Copy("en", "%s is your Opas verification code", "Verify your email",
                    "Here is your verification code:",
                    "Enter this code in the Opas app to verify your email. It works for 15 minutes, then expires.",
                    "If you didn't request this code, you can ignore this email. Nothing will change.",
                    "It works for 15 minutes.", "Your guide through Finnish paperwork.",
                    "You're receiving this because an Opas account was created with this email address."),
            "fi", new Copy("fi", "%s on Opas-vahvistuskoodisi", "Vahvista sähköpostiosoitteesi",
                    "Tässä on vahvistuskoodisi:",
                    "Syötä koodi Opas-sovellukseen vahvistaaksesi sähköpostiosoitteesi. Koodi on voimassa 15 minuuttia.",
                    "Jos et pyytänyt koodia, voit jättää tämän viestin huomiotta. Mikään ei muutu.",
                    "Koodi on voimassa 15 minuuttia.", "Oppaasi suomalaiseen paperityöhön.",
                    "Saat tämän viestin, koska tällä sähköpostiosoitteella luotiin Opas-tili."),
            "sv", new Copy("sv", "%s är din verifieringskod för Opas", "Verifiera din e-postadress",
                    "Här är din verifieringskod:",
                    "Ange koden i Opas-appen för att verifiera din e-postadress. Den gäller i 15 minuter.",
                    "Om du inte begärde koden kan du ignorera det här meddelandet. Inget ändras.",
                    "Koden gäller i 15 minuter.", "Din guide genom finländskt pappersarbete.",
                    "Du får det här meddelandet eftersom ett Opas-konto skapades med den här e-postadressen."));

    static final Map<String, Copy> PASSWORD_RESET = Map.of(
            "en", new Copy("en", "%s is your Opas password reset code", "Reset your password",
                    "We received a request to reset your Opas password. Here is your reset code:",
                    "Enter this code in the Opas app to choose a new password. It works for 15 minutes, then expires.",
                    "If you didn't ask to reset your password, you can ignore this email. Your password will not change.",
                    "It works for 15 minutes.", "Your guide through Finnish paperwork.",
                    "You're receiving this because a password reset was requested for your Opas account."),
            "fi", new Copy("fi", "%s on Opas-salasanasi palautuskoodi", "Vaihda salasanasi",
                    "Saimme pyynnön vaihtaa Opas-tilisi salasanan. Tässä on palautuskoodisi:",
                    "Syötä koodi Opas-sovellukseen ja valitse uusi salasana. Koodi on voimassa 15 minuuttia.",
                    "Jos et pyytänyt salasanan vaihtoa, voit jättää tämän viestin huomiotta. Salasanasi ei muutu.",
                    "Koodi on voimassa 15 minuuttia.", "Oppaasi suomalaiseen paperityöhön.",
                    "Saat tämän viestin, koska Opas-tilillesi pyydettiin salasanan vaihtoa."),
            "sv", new Copy("sv", "%s är din kod för att återställa lösenordet i Opas", "Återställ ditt lösenord",
                    "Vi fick en begäran om att återställa lösenordet till ditt Opas-konto. Här är din kod:",
                    "Ange koden i Opas-appen för att välja ett nytt lösenord. Den gäller i 15 minuter.",
                    "Om du inte begärde en återställning kan du ignorera det här meddelandet. Ditt lösenord ändras inte.",
                    "Koden gäller i 15 minuter.", "Din guide genom finländskt pappersarbete.",
                    "Du får det här meddelandet eftersom någon begärde en lösenordsåterställning för ditt Opas-konto."));

    private final SesV2Client sesClient;
    private final boolean enabled;
    private final String fromAddress;

    public EmailService(SesV2Client sesClient,
            @Value("${opas.mail.enabled:false}") boolean enabled,
            @Value("${opas.mail.from:no-reply@opas.fi}") String fromAddress) {
        this.sesClient = sesClient;
        this.enabled = enabled;
        this.fromAddress = fromAddress;
    }

    /** Emails a verification code to a newly registered (or re-verifying) user, in their language. */
    public void sendVerificationCode(String toAddress, String code, String language) {
        Copy copy = copyFor(VERIFICATION, language);
        if (!enabled) {
            // Dev / test only: never call SES; log so the code can be read from the app log.
            log.warn("[mail disabled] verification code for {} is {}", toAddress, code);
            return;
        }
        send(toAddress, copy, code);
    }

    /** Emails a one-time password-reset code, in the user's language. */
    public void sendPasswordResetCode(String toAddress, String code, String language) {
        Copy copy = copyFor(PASSWORD_RESET, language);
        if (!enabled) {
            log.warn("[mail disabled] password reset code for {} is {}", toAddress, code);
            return;
        }
        send(toAddress, copy, code);
    }

    static Copy copyFor(Map<String, Copy> copies, String language) {
        return copies.getOrDefault(language == null ? "en" : language, copies.get("en"));
    }

    static String subject(Copy copy, String code) {
        // The code leads the subject so it survives lock-screen truncation — a stressed
        // user can often finish without opening the email at all.
        return copy.subject().formatted(code);
    }

    static String text(Copy copy, String code) {
        return String.join("\n\n", copy.intro(), code, copy.instructions(), copy.ignore(),
                "Opas — " + copy.tagline()) + "\n";
    }

    /**
     * Branded HTML. Deliberately light-themed: dark backgrounds get auto-inverted by mobile
     * mail clients and read as phishing. Table layout + inline styles only — the only
     * markup every client respects. No images: blocked-image placeholders erode exactly
     * the trust this mail must project, so the wordmark is set in type.
     */
    static String html(Copy copy, String code) {
        return """
                <!DOCTYPE html>
                <html lang="%1$s">
                <head>
                  <meta charset="utf-8">
                  <meta name="viewport" content="width=device-width, initial-scale=1">
                  <meta name="color-scheme" content="light">
                </head>
                <body style="margin:0;padding:0;background:%2$s;-webkit-font-smoothing:antialiased;">
                  <span style="display:none;max-height:0;overflow:hidden;mso-hide:all;">%3$s&nbsp;&zwnj;</span>
                  <table role="presentation" width="100%%" cellpadding="0" cellspacing="0" border="0" style="background:%2$s;">
                    <tr>
                      <td align="center" style="padding:40px 16px;">
                        <table role="presentation" width="480" cellpadding="0" cellspacing="0" border="0" style="width:480px;max-width:100%%;background:%4$s;border:1px solid %5$s;border-radius:12px;">
                          <tr>
                            <td style="padding:36px 40px 0 40px;font-family:%6$s;">
                              <span style="font-size:24px;font-weight:500;color:%7$s;letter-spacing:-0.3px;">Opas</span><span style="font-size:24px;color:%8$s;">.</span>
                            </td>
                          </tr>
                          <tr>
                            <td style="padding:24px 40px 0 40px;">
                              <p style="margin:0 0 20px 0;font-family:%6$s;font-size:22px;font-weight:500;color:%7$s;line-height:1.3;">%9$s</p>
                              <p style="margin:0 0 20px 0;font-family:%10$s;font-size:15px;color:%11$s;line-height:1.55;">%12$s</p>
                            </td>
                          </tr>
                          <tr>
                            <td align="center" style="padding:0 40px;">
                              <table role="presentation" width="100%%" cellpadding="0" cellspacing="0" border="0">
                                <tr>
                                  <td align="center" bgcolor="%13$s" style="background:%13$s;border:1px solid %5$s;border-radius:8px;padding:22px 16px;font-family:%14$s;font-size:34px;font-weight:700;letter-spacing:10px;color:%7$s;">%15$s</td>
                                </tr>
                              </table>
                            </td>
                          </tr>
                          <tr>
                            <td style="padding:20px 40px 0 40px;font-family:%10$s;">
                              <p style="margin:0;font-size:15px;color:%11$s;line-height:1.55;">%16$s</p>
                              <p style="margin:20px 0 0 0;font-size:13px;color:%17$s;line-height:1.55;">%18$s</p>
                            </td>
                          </tr>
                          <tr>
                            <td style="padding:32px 40px 36px 40px;">
                              <div style="border-top:1px solid %5$s;margin-bottom:16px;"></div>
                              <p style="margin:0 0 4px 0;font-family:%6$s;font-size:14px;font-weight:500;color:%11$s;">Opas<span style="color:%8$s;">.</span></p>
                              <p style="margin:0;font-family:%10$s;font-size:12px;color:%17$s;line-height:1.5;">%19$s<br>%20$s</p>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                </body>
                </html>
                """.formatted(copy.lang(), PAGE, copy.preheader(), CARD, BORDER, SERIF, INK, PINE, copy.heading(),
                SANS, INK_SOFT, copy.intro(), CODE_BG, MONO, code, copy.instructions(), MUTED, copy.ignore(),
                copy.tagline(), copy.reason());
    }

    private void send(String toAddress, Copy copy, String code) {
        try {
            SendEmailRequest request = SendEmailRequest.builder()
                    // Friendly sender name in the inbox — a bare Gmail address reads as spam.
                    .fromEmailAddress(FROM_NAME + " <" + fromAddress + ">")
                    .destination(Destination.builder().toAddresses(toAddress).build())
                    .content(EmailContent.builder()
                            .simple(Message.builder()
                                    .subject(Content.builder().data(subject(copy, code)).charset("UTF-8").build())
                                    .body(Body.builder()
                                            .text(Content.builder().data(text(copy, code)).charset("UTF-8").build())
                                            .html(Content.builder().data(html(copy, code)).charset("UTF-8").build())
                                            .build())
                                    .build())
                            .build())
                    .build();
            sesClient.sendEmail(request);
        } catch (Exception e) {
            // Do not include the recipient address in the message at ERROR (PII in logs);
            // the stack trace is enough to diagnose SES/identity/quota failures.
            log.error("Failed to send email via SES", e);
            throw new IllegalStateException("Could not send email");
        }
    }
}
