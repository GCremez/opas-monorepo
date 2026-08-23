package com.opas.service;

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

    /** Emails a verification code to a newly registered (or re-verifying) user. */
    public void sendVerificationCode(String toAddress, String code) {
        // The code leads the subject so it survives lock-screen truncation — a stressed
        // user can often verify without opening the email at all.
        String subject = code + " is your Opas verification code";
        String text = """
                Hello,

                Here is your Opas verification code:

                %s

                Enter this code in the Opas app to verify your email. It works for 15 minutes, then expires.

                If you didn't request this code, you can ignore this email - nothing will change.

                Opas - your guide through Finnish paperwork
                """.formatted(code);
        String html = verificationHtml(code);

        if (!enabled) {
            // Dev / test: never call SES. Log at WARN so the code is easy to find, but
            // do not log it in a way that would leak into aggregated prod logs — this
            // branch is only reachable when mail is explicitly disabled.
            log.warn("[mail disabled] verification code for {} is {}", toAddress, code);
            return;
        }
        send(toAddress, subject, text, html);
    }

    /**
     * Branded HTML for the verification email. Deliberately light-themed: dark
     * backgrounds get auto-inverted by mobile mail clients and read as phishing.
     * Table layout + inline styles only — the only markup every client respects.
     * No images: blocked-image placeholders erode exactly the trust this mail must
     * project, so the wordmark is set in type.
     */
    private String verificationHtml(String code) {
        return """
                <!DOCTYPE html>
                <html lang="en">
                <head>
                  <meta charset="utf-8">
                  <meta name="viewport" content="width=device-width, initial-scale=1">
                  <meta name="color-scheme" content="light">
                </head>
                <body style="margin:0;padding:0;background:#f5f5f7;-webkit-font-smoothing:antialiased;">
                  <span style="display:none;max-height:0;overflow:hidden;mso-hide:all;">It works for 15 minutes.&nbsp;&zwnj;</span>
                  <table role="presentation" width="100%%" cellpadding="0" cellspacing="0" border="0" style="background:#f5f5f7;">
                    <tr>
                      <td align="center" style="padding:40px 16px;">
                        <table role="presentation" width="480" cellpadding="0" cellspacing="0" border="0" style="width:480px;max-width:100%%;background:#ffffff;border:1px solid #e8e8ed;border-radius:16px;">
                          <tr>
                            <td style="padding:36px 40px 0 40px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
                              <span style="font-size:22px;font-weight:700;color:#1d1d1f;letter-spacing:-0.5px;">Opas</span><span style="font-size:22px;font-weight:700;color:#92d9bb;">.</span>
                            </td>
                          </tr>
                          <tr>
                            <td style="padding:28px 40px 0 40px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
                              <p style="margin:0 0 24px 0;font-size:17px;font-weight:600;color:#1d1d1f;line-height:1.4;">Verify your email</p>
                              <p style="margin:0 0 20px 0;font-size:15px;color:#3a3a3c;line-height:1.55;">Here is your verification code:</p>
                            </td>
                          </tr>
                          <tr>
                            <td align="center" style="padding:0 40px;">
                              <table role="presentation" width="100%%" cellpadding="0" cellspacing="0" border="0">
                                <tr>
                                  <td align="center" bgcolor="#eef8f2" style="background:#eef8f2;border:1px solid #d7efe1;border-radius:12px;padding:22px 16px;font-family:'JetBrains Mono','SF Mono',SFMono-Regular,Menlo,Consolas,monospace;font-size:34px;font-weight:700;letter-spacing:10px;color:#111111;">%s</td>
                                </tr>
                              </table>
                            </td>
                          </tr>
                          <tr>
                            <td style="padding:20px 40px 0 40px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
                              <p style="margin:0;font-size:15px;color:#3a3a3c;line-height:1.55;">Enter this code in the Opas app to verify your email. It works for <strong style="color:#1d1d1f;">15 minutes</strong>, then expires.</p>
                              <p style="margin:20px 0 0 0;font-size:13px;color:#86868b;line-height:1.55;">If you didn't request this code, you can ignore this email - nothing will change.</p>
                            </td>
                          </tr>
                          <tr>
                            <td style="padding:32px 40px 36px 40px;">
                              <div style="border-top:1px solid #ececf0;margin-bottom:16px;"></div>
                              <p style="margin:0 0 4px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:13px;font-weight:600;color:#3a3a3c;">Opas<span style="color:#92d9bb;">.</span></p>
                              <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:12px;color:#86868b;line-height:1.5;">Your guide through Finnish paperwork.<br>You're receiving this because an Opas account was created with this email address.</p>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                </body>
                </html>
                """.formatted(code);
    }

    private void send(String toAddress, String subject, String textBody, String htmlBody) {
        try {
            SendEmailRequest request = SendEmailRequest.builder()
                    // Friendly sender name in the inbox — a bare Gmail address reads as spam.
                    .fromEmailAddress(FROM_NAME + " <" + fromAddress + ">")
                    .destination(Destination.builder().toAddresses(toAddress).build())
                    .content(EmailContent.builder()
                            .simple(Message.builder()
                                    .subject(Content.builder().data(subject).charset("UTF-8").build())
                                    .body(Body.builder()
                                            .text(Content.builder().data(textBody).charset("UTF-8").build())
                                            .html(Content.builder().data(htmlBody).charset("UTF-8").build())
                                            .build())
                                    .build())
                            .build())
                    .build();
            sesClient.sendEmail(request);
        } catch (Exception e) {
            // Do not include the recipient address in the message at ERROR (PII in logs);
            // the stack trace is enough to diagnose SES/identity/quota failures.
            log.error("Failed to send verification email via SES", e);
            throw new IllegalStateException("Could not send verification email");
        }
    }
}
