# Data Protection Impact Assessment: Opas

Draft for legal review · 8 November 2026 · Controller: __CONTROLLER__

This assessment covers reading people's official letters with AI. It is a draft written from the code. A lawyer or data-protection adviser should review it before Opas has real users. The open questions are listed at the end.

## 1. Why a DPIA

GDPR Article 35 requires one when processing is likely to be high-risk. The EDPB guidelines say two or more of their nine criteria usually means a DPIA is needed. Opas meets at least three:

| EDPB criterion | How Opas meets it |
|---|---|
| Sensitive data | Letters can contain health data (Kela sickness, disability and rehabilitation decisions), plus financial data and residence status |
| Innovative technology | A large language model (Claude, by Anthropic) reads the letters |
| Vulnerable data subjects | Users are often recent immigrants in a stressful situation, reading in a second language |

The Finnish Data Protection Ombudsman also publishes a list of processing that always needs a DPIA. The adviser should check Opas against it.

## 2. What happens to the data

1. The user photographs a letter. The image is uploaded over HTTPS to a private S3 bucket (AWS, Stockholm).
2. Amazon Textract (AWS, Frankfurt) reads the text out of the image.
3. Presidio, which runs on Opas's own servers, removes names, personal identity codes, addresses and phone numbers.
4. The remaining text goes to Anthropic's API (United States), which writes the explanation, deadlines and actions.
5. The result is stored in Postgres with the letter, so the user can read it again. Deadlines become reminders on the phone.

Other processors: AWS SES for email; Expo, Apple and Google for push notifications, which never contain letter content; PostHog (EU) for usage events; Sentry for crash reports.

## 3. Legal basis

| Processing | Basis |
|---|---|
| Account, storing letters, reminders | Contract, Art. 6(1)(b) |
| Health and other special category data in letters | Explicit consent, Art. 9(2)(a) |
| Sending letter text to the AI provider | Consent, Art. 6(1)(a), and explicit consent where health data is involved |
| Usage events and crash reports | Legitimate interest, Art. 6(1)(f) |

The consent is recorded with a timestamp and the version of the wording shown (`users.ai_consent_at`, `users.ai_consent_version`). It can be withdrawn in Profile → AI reading, and processing new letters then stops. The backend refuses to decode without consent to the current wording, so this isn't only enforced in the app.

## 4. Necessity and proportionality

- **Purpose:** explain the user's own letters to them. Nothing else. No profiling, no advertising, no selling data.
- **Minimisation:** identifiers are removed before the AI step. Analytics contain no letter content. Crash reports exclude personal data (`sendDefaultPii: false`). There is no session replay or autocapture.
- **Storage limitation:** letters are kept until the user deletes them or the account. Account deletion removes every row and file. Analytics and crash data: up to 12 months.
- **Transparency:** a plain-English privacy policy, and a consent screen before the first scan.
- **Rights:** access, correction, export and deletion by email; deletion in the app, and by email without the app.

## 5. Risks and measures

| Risk | Likelihood · impact | Measures in place | Still to do |
|---|---|---|---|
| Health data reaches the AI provider | Likely · high | Explicit consent; identifiers removed first; Anthropic does not train on API data | Sign Anthropic's DPA; confirm its retention period and transfer mechanism |
| Scrubbing misses an identifier | Possible · medium | Presidio, which fails closed: no scrubbing, no decode | Load a Finnish model so Finnish identity codes and names are caught better |
| Textract keeps content to improve AWS services | Possible · high | (none yet) | **Enable the AWS Organizations AI services opt-out policy** |
| Data breach in storage | Unlikely · high | Private bucket, presigned links that expire in 1 hour, TLS, bcrypt passwords, short-lived tokens | Encryption at rest on S3 and the database; backups policy |
| Account takeover | Unlikely · high | Rate limits on the real client IP, verification codes with 5 tries, refresh tokens revoked on logout and password change | Optional: Sign in with Google/Apple |
| A user relies on a wrong explanation | Possible · high | Terms and screens say to check the original letter, which is always one tap away | Show it on the result screen too |
| Transfers to the US (Anthropic, Expo, possibly Sentry) | Certain · medium | Listed in the privacy policy | Confirm each one's mechanism (EU–US Data Privacy Framework or SCCs); create Sentry in its EU region |
| Analytics identify a person | Unlikely · low | Random ID, no content | Turn on "Discard client IP data" in PostHog; set retention to 12 months or less |

## 6. Open questions for the adviser

1. Is the consent wording explicit enough for Art. 9(2)(a)? It's in `opas-mobile/src/i18n/*.json`, under `consent`.
2. Do letters from Migri also reveal special category data, such as ethnic origin or religion in asylum matters, which the consent should name?
3. Does Opas need to consult the Ombudsman before launch (Art. 36) if the residual risk is still high?
4. Is a record of processing (Art. 30) required at Opas's size? With special category data, the small-company exemption probably doesn't apply.
5. Does the AI-generated explanation trigger any obligations under the EU AI Act? It's likely a limited-risk system with transparency duties.

## 7. Sign-off

| Role | Name | Date | Decision |
|---|---|---|---|
| Controller | | | |
| Adviser | | | |
