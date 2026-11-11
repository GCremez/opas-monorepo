# Data safety form

Answers for Play Console → App content → Data safety. Each row names the code or
policy that makes the answer true, so a reviewer's question has an answer ready.

## Section 1: collection and security

| Question | Answer | Why |
|---|---|---|
| Does your app collect or share any of the required user data types? | **Yes** | Account data, scanned letters, analytics events and push tokens leave the device |
| Is all of the user data collected by your app encrypted in transit? | **Yes** | Every call goes to `https://api.getopas.app` over TLS; there is no plaintext endpoint |
| Do you provide a way for users to request that their data is deleted? | **Yes** | In-app: Profile → Delete account. Without the app: `https://getopas.app/delete-account/`. Email: `privacy@getopas.app` |
| Do you have a privacy policy? | **Yes** | `https://getopas.app/privacy/` |
| Have you committed to the Play Families policy? | **No** | Not a children's app; the target audience is adults handling official letters |
| Have you had an independent security review? | **No** | Not claimed |

## Section 2: data types

Legend: *Collected* = leaves the device. *Shared* = handed to a third party for
its own purposes. AWS, Anthropic, PostHog, Sentry and Expo are **service
providers** under Play's definition: they process on Opas's instructions only,
so the answer is **not shared**.

| Play data type | Collected | Shared | Optional? | Purposes | Evidence |
|---|---|---|---|---|---|
| **Personal info → Name** | Yes | No | Required | App functionality, Account management | `User.name`; registration form; shown under Profile |
| **Personal info → Email address** | Yes | No | Required | App functionality, Account management, Developer communications | `User.email`; login, verification, result-ready email, replies |
| **Personal info → User IDs** | Yes | No | Required | App functionality, Analytics | Account UUID (`User.id`) is the PostHog distinct ID and the document owner key |
| **Health info** (inside a letter) | Yes | No | Optional | App functionality | A Kela or hospital letter can contain diagnoses or treatment. Sent only after the explicit Art. 9(2)(a) consent screen, redacted first, then to Claude through the Anthropic API (may be processed in the US). Stored as part of the document until deleted |
| **Photos** | Yes | No | Optional | App functionality | `expo-image-picker` / `expo-camera`; the photo is uploaded for Textract and stored as the original letter |
| **Files and docs** | Yes | No | Optional | App functionality | PDF import via `expo-document-picker`; the PDF is uploaded and stored |
| **App activity → App interactions** | Yes | No | Required | Analytics | PostHog events in `src/lib/analytics.ts` and call sites: scans, logins, tab taps, document actions. No letter text, names or emails are attached |
| **App info and performance → Crash logs** | Yes | No | Required | Analytics | Sentry (`src/lib/sentry.ts`) with `sendDefaultPii: false`; no document content and no email |
| **App info and performance → Diagnostics** | Yes | No | Required | Analytics | Sentry performance traces, sampled at 0.2 |
| **Device or other IDs** | Yes | No | Optional | App functionality, Analytics | Expo push token (`/push/register`) when notifications are on; PostHog/Sentry installation identifiers. The token is deleted from the server when Expo reports it unregistered |

### Not collected

| Type | Why not |
|---|---|
| Location | No location library or permission is installed |
| Financial info | No checkout in the app. `CAN_PURCHASE` is false on Android, and subscriptions are bought on the website through Stripe, which never passes card data to Opas |
| Purchase history | No Play Billing yet. The app reads the plan from `/subscriptions/me`, which is not a purchase record |
| Contacts | No contacts library or permission |
| Calendar events | `READ_CALENDAR`/`WRITE_CALENDAR` are used only on the device to create deadline events. No calendar data is uploaded. (This is why the type is not listed even though the permission is declared) |
| Messages | No email, SMS or in-app messaging features |
| Audio | Microphone is explicitly blocked in `app.json` (`RECORD_AUDIO` is in `blockedPermissions`) |
| Web browsing | No browser history access |
| Address, phone number | Not asked for. Addresses inside letters are removed by redaction before the AI sees them |

## Section 3: handling details

| Question | Answer |
|---|---|
| Is the data processed ephemerally? | **No** for account data, letters, analytics and crash logs — they are stored until deleted or until their retention period ends. Letter text sent to Bedrock is not retained by Anthropic or AWS, but the extracted text and explanation are stored in the Opas database |
| Is the data required or optional? | Name, email, user ID, analytics and crash logs are required to use the app. Photos, files, health information inside letters and push tokens are optional |
| Can users request deletion? | Yes — in-app and at `https://getopas.app/delete-account/` |
| Retention | Letters and account: until deleted. Usage events and crash reports: 12 months. See the privacy policy |

## Things that must stay true

These are the claims the form depends on. If one changes, update the form before
the next release.

1. **No letter content in analytics.** `analytics.ts` accepts only strings,
   numbers, booleans and nulls, and no call site passes letter text. `sendDefaultPii`
   is false. Do not add session replay or autocapture.
2. **Redaction runs before the AI.** The privacy policy promises names, ID codes
   and addresses are removed on the server first. Moving to on-device OCR (P2-2)
   changes the wording, not the promise.
3. **No billing data in the app.** If Play Billing lands (P1-6), add "Purchase
   history" and possibly "Financial info" to the form, and re-check the content
   rating's digital-purchases answer.
4. **Processors only.** AWS, Anthropic, PostHog, Sentry and Expo must stay on
   contracts that make them processors. Turning on a third-party ad or data
   broker SDK would turn "not shared" into "shared" and require a form change.
5. **Deletion really deletes.** The in-app flow and `/delete-account/` must both
   remove the account, letters, push tokens and analytics identity. A deletion
   request that only hides rows would make the answer false.

## Reviewer notes

- **App access:** all features need an account. Put a verified demo login in
  Play Console → App content → App access.
- **Health data:** the consent screen is the first thing shown before a scan, and
  it can be withdrawn under Profile → AI reading. This is deliberate for GDPR
  Art. 9(2)(a) and is also what the Data safety "Health info" answer relies on.
- **AI-generated content:** explanations are generated by Claude. The app must
  offer a way to report offensive output before production; see
  `release-checklist.md`.
