# Opas launch plan

Product positioning, competitors, pricing, setup requirements and the phased roadmap for Opas, the AI assistant that helps international residents understand and act on official Finnish mail.

Last updated: 11 November 2026. [§8](#8-changes-from-the-previous-versions) lists what changed from the earlier versions and why.

---

## Contents

1. [Product positioning and value proposition](#1-product-positioning-and-value-proposition)
2. [Market dynamics and competitors](#2-market-dynamics-and-competitors)
3. [Revenue and pricing](#3-revenue-and-pricing)
4. [Launch setup checklist](#4-launch-setup-checklist)
5. [Phased product roadmap](#5-phased-product-roadmap)
6. [Beta plan and success metrics](#6-beta-plan-and-success-metrics)
7. [Open questions](#7-open-questions)
8. [Changes from the previous versions](#8-changes-from-the-previous-versions)
9. [Sources](#9-sources)

---

## 1. Product positioning and value proposition

### The problem

International workers, students and immigrants in Finland receive official letters in Finnish and Swedish from Kela, Migri (Immigration), Vero (Tax Administration) and DVV (Digital and Population Data Services). Mistakes or missed deadlines can mean lost benefits, penalties or residence permit problems.

### Opas vs. Google Translate and ChatGPT

Translation tools give people the words. Translation was never the hard part. Knowing what a letter means for *you* is. ChatGPT can explain a photographed letter for free, so explaining a single letter is not something people will pay for. Opas has to win where general tools fall short:

- **No administrative context.** General models don't reliably know Finnish workflows, appeal periods, or which reference numbers (*diaarinumero*) a reply must quote.
- **Privacy.** Pasting a whole letter, henkilötunnus included, into a public chatbot exposes sensitive data. Opas removes personal details before the AI sees the text, with Finnish and Swedish language models and Finnish patterns, and Claude reads only that redacted text. (Claude runs through the Anthropic API for the beta, so letters may be processed outside the EU: decided 11 Nov 2026, see §4.)
- **No workflow.** ChatGPT outputs text. It doesn't track deadlines, link related letters into a case, or keep a structured record.

| What the user needs | ChatGPT today | Where Opas wins |
|---|---|---|
| Understand this one letter | Good enough | Not a reason to pay |
| Remember my case (the 3rd Migri letter refers to the 1st) | Forgets | Case timeline |
| Don't miss the deadline | Doesn't know when it is | Smart reminders 7, 3 and 1 day before and the morning of (Premium); calendar export |
| Scary or routine? | Hedges | Urgency label |
| Reply in proper Finnish | Can, but the user can't check it | Drafts that quote the right references and attachments |
| Accuracy | Sometimes makes up rules | Answers with official sources |

### Core value proposition

> **"Don't just translate official mail. Resolve it."**
> Day-to-day copy: **Never miss a Kela or Migri deadline. Know if it's urgent. Reply in proper Finnish.**

Opas gives single-scan clarity, removes personal data before the AI reads anything, manages deadlines, and tracks cases step by step, built around Finnish authorities. Sell peace of mind, not AI.

### Personas

| Persona | Real worry | Would they pay? | What it means for us |
|---|---|---|---|
| Specialist on a work permit | Migri: extensions, hearing letters, family reunification | Yes, but rarely | One-off credit packs, not only a subscription |
| Ukrainian family (second-largest, fast-growing group) | Many Kela letters, tight money | Rarely, and no explanations in Ukrainian or Russian yet | More explanation languages ([P1-2](#v2--case-aware-copilot-and-monetisation)) |
| International student | Vero tax card, DVV, Migri renewals | No | Reach them through university licences |
| Expat 3+ years in | Knows the system | Will churn | Keep them as the place their records live |

---

## 2. Market dynamics and competitors

### Digital mail since 14 April 2026

Official mail in Finland has been **primarily digital since 14 April 2026**, through Suomi.fi Messages, with OmaKela as Kela's main channel. Kela alone sends 14+ million documents a year. Paper is now the exception. So:

- Most letters arrive as **PDFs**, not paper. PDF import shipped in PR #11; a share-sheet extension is [P1-1](#v2--case-aware-copilot-and-monetisation).
- **OmaKela is Finnish and Swedish only**, so English speakers open their mail in an interface they can't read. We expect this to drive demand, but it's an assumption to test in the beta, not a measured spike.
- **DVV plans to allow other approved digital mail services.** Posti took over Kivra's Finnish business in April 2026 and is merging it into OmaPosti. See [P2-3](#v3--b2b-distribution-and-platform-infrastructure).
- **Market size:** about 51,000 people moved to Finland in 2025, and about 11% of residents have a foreign background.
- **Free alternatives exist:** Kela interpreters, InfoFinland, municipal advice points, unions.

### Competitors

> ⚠️ The **business model** and **feature** details in this table (pricing, ads, TTS, overlays, HR licensing, per-letter prices) come from the draft plan and haven't been verified: the competitors' sites couldn't be opened during research. **Verify before quoting externally.** Where research found something different, it says so.

| Competitor | Market | Business model (unverified) | Strengths | Opas advantage |
|---|---|---|---|---|
| **BriefKlar** | Germany + FR, IT, ES, NL, PL | Freemium + ad-rewarded scans, €4.99–9.90/mo. Research confirmed a free tier of 3 letters/month | Reply drafting, 30+ languages (35+ per its site), audio read-out | Finland-specific knowledge (Kela, Migri, Suomi.fi). **Biggest threat:** already multi-country, and Finland is an obvious next step |
| **TiG Desk** | Germany | Draft says B2C subscription + B2B HR licences. **Research found the app is free** | On-device OCR (the photo never leaves the phone), deadline calendar | Nordic focus. Note: TiG Desk sets the privacy bar we're behind on until [P2-2](#v3--b2b-distribution-and-platform-infrastructure) |
| **Foldy** | Germany / EU | B2C subscription, €4–8/mo | Plain-language next steps, 5 languages including Ukrainian, Claude via AWS Bedrock in the EU | Active workflow (replies, case timelines). Opas now runs Claude the same way: Bedrock, in Stockholm |
| **Advocat / LetterHelp** | Estonia / Finland | Pay per letter, €5–20 per appeal | Disputes, appeals, immigration letters | Instant and cheaper, without a legal consultation |
| **Amtli, DocuPilot** | Germany | Not researched | Letter explainers | Show that explaining letters is already a commodity |
| **FinnPermit** | Finland | Not researched | Immigration Q&A, no letters | Opas works from the user's own letters |

**Takeaway:** the category competes on languages, privacy and reply quality, and some apps give explaining away for free. Don't plan around being the only one.

---

## 3. Revenue and pricing

### The principle

Free answers **"What does this letter say?"** Premium answers **"How do I get through this whole situation without a mistake?"**

Premium can't feel like the free tier with the limits removed. People pay for a safety net: saved time, avoided penalties, and a whole process handled, not single letters.

- **Free: hook and build trust.** Read the letter, see the deadline, add it to the calendar, and (during the beta) draft a first reply.
- **Premium: peace of mind for the whole case.** Deep explanations, a case that remembers its history, complete replies, your own language, and a record you can hand to an advisor.

### Free vs. Premium

| Feature / capability | Free tier | Premium tier | Conversion hook / value proposition |
|---|---|---|---|
| **Document scans & analysis** | 3 letters / month | Unlimited scans & uploads | Heavy mail periods (moving, tax season, visa renewal) exceed free limits fast. |
| **Translation & analysis** | Key bullet points + action items | Key bullet points + deep explanations | Explains why decisions were made (e.g. Kela housing benefit income thresholds). |
| **Deadline tracking** | Basic local phone calendar export | Smart reminders + timeline countdown | Push alerts 7, 3, and 1 day before deadlines to prevent costly missed appeal windows. |
| **Reply drafting** | Short, standard reply template (1 paragraph) | Full custom AI reply generator | Tailored counter-arguments, custom tone, and document attachment guidance. |
| **Case threading** (V2) | Single-letter view only | Multi-letter case timelines | Connects multi-month administrative chains into one active timeline. |
| **Multi-language support** | English summary only | Native explanations in 10+ languages | Native clarity for Ukrainian, Russian, Arabic, Tagalog, Spanish, etc. |
| **Form assistant** (V3) | Not included | Interactive form helper | Step-by-step guidance for filling online OmaKela / Suomi.fi portal forms. |
| **Export & records** | Standard text copy | One-click case dossier PDF export | Clean PDF bundle for lawyers, union advisors (TEK), or formal appeals. |

Decided 11 November 2026: the free tier is **3 letters a month, beta included**, and **deadline reminders are Premium only** (reversing the 10 November decision). Free users still see every deadline in the Needs you list and can add one to their calendar. During the beta everyone gets reminders (`REMINDERS_FREE_FOR_EVERYONE`), because nobody can buy Premium yet.

**What "smart" means (built 11 Nov 2026, `src/lib/reminders.ts`):** reminders a week, 3 days and 1 day before and on the morning it's due; none for a deadline already ticked off; deadlines that would remind at the same moment arrive as one notification, nearest first. Next: the case-wide countdown (P1-7).

**Decided (11 Nov 2026): free explanations are in English only.** Today the app explains a letter in the app language (English, Finnish or Swedish) for everyone; Finnish, Swedish and the 10+ new languages become Premium (P1-9). The app itself stays in all three languages.

**What to lead with in marketing and the paywall:**

1. **Risk shield.** A letter says "pay back €450 by 30 November". Premium shows what happens if you ignore it, what your options are, and drafts the appeal.
2. **Case memory.** Letter 2 is a follow-up to letter 1 from three months ago. Premium knows, and the reply quotes the earlier dates and *diaarinumero* automatically.
3. **Household sharing.** One person manages everyone's Kela and Vero mail.

**Guardrails for Premium features**
- **Not legal advice.** "Appeal strategy" and "counter-arguments" must stay explanations of the user's options with the official source, plus a draft the user checks. Confirm with a lawyer before marketing appeals (§7).
- **Only claim what we can cite.** Deep explanations depend on official sources (P1-4); without them, Premium would be confident guessing.
- **Free users still see their deadlines.** Reminders are Premium, but the deadline itself is always on the letter, in the Needs you list and exportable to the calendar. Never hide a deadline behind the paywall.

### Prices

| Plan | Price | For whom |
|---|---|---|
| **Free** | €0 | Everyone: 3 letters a month, deadlines list and calendar export, short replies |
| **Premium monthly** | **€5.99 / month**, cancel anytime | Busy periods: moving, permits, tax season |
| **Premium yearly** | **€49.99 / year** (€4.17/month, 30% off monthly) | Long-term workers and students |
| **Single Case Pass** | **€3.99 one-off**: 5 more letters + one full reply | People with one or two urgent letters a year who don't want a subscription |
| **B2B licences** | Per seat | Employers, relocation agencies, universities and unions give Opas to new arrivals |

Replaces the earlier €4.99 / €39.99 and "€3.99 for 5 letters" (§8). Store fees come off these prices (15% for small developers on both stores).

**Where the app is (11 Nov 2026):** free limit 3, Premium screen and website at €5.99 / €49.99 with "Save 30% yearly", and smart reminders listed as Premium (on for everyone during the beta). Still to do: the Stripe prices themselves, the Single Case Pass, and the new Premium features. See [P1-9](#v2--case-aware-copilot-and-monetisation).

## 4. Launch setup checklist

**Already done in [PR #11](https://github.com/GCremez/opas-monorepo/pull/11)** (code):
- Domain `getopas.app` (API at `api.getopas.app`, email from `no-reply@getopas.app`).
- Email links open the app.
- App ID `app.getopas`.
- PDF import.
- AI consent screen naming Anthropic.
- "AI can make mistakes / not legal advice" notices.
- No prices or checkout on iOS (`CAN_PURCHASE` in `src/lib/billing.ts`).

**Also done on the same branch** (V1 code work):
- Reply drafts were sending the raw file bytes to Claude, unredacted. They now use the extracted text with personal data removed, like decoding.
- Free reply drafts for everyone during the beta (P0-5).
- Finnish redaction with a 20-letter test set (P0-4).
- Redaction no longer removes deadlines, plus Finnish and Swedish language models (P0-4).
- Claude on Amazon Bedrock in Stockholm (P0-3).
- Translated server pushes (P0-7).
- Updated README (P0-8).
- No checkout on Android either (Google Play first, see below).

**Decisions (11 November 2026):**
- **Claude through the Anthropic API, not Bedrock,** for the beta: no budget for Bedrock and the AWS account has no access, while the existing Anthropic key works today. Letter text may be processed outside the EU (Anthropic's `inference_geo` offers `global` or `us`, no EU option). Consent screen v4, privacy policy, home and support pages say so. Set a monthly spend limit on the Anthropic account. `AI_PROVIDER=bedrock` switches back (with a new consent version) once there's budget.
- **Free tier is 3 letters a month**, during the beta too.
- **Deadline reminders are Premium only, and smart** (7, 3 and 1 day before, morning of, merged when they coincide). Reverses the 10 Nov decision below. On for everyone during the beta.
- **Free explanations are in English only.** Explanations in any other language are Premium.

**Decisions (10 November 2026):**
- **Google Play first.** The beta and first release are on Android. Play requires Play Billing for subscriptions (unless enrolled in Google's EEA alternative billing programme), so `CAN_PURCHASE` is now false on every platform: no prices or checkout in the app until store billing is added (P1-6). Nobody needs to pay during the beta: reply drafts are free.
- ~~Deadline reminders stay free.~~ Reversed on 11 Nov: Premium only.

**Infrastructure and operations:**

- [ ] **Hosting for the beta (decided 11 Nov 2026: free).** One Oracle Cloud Always Free ARM VM (2 OCPU, 12 GB, EU home region) runs the backend, PostgreSQL, Redis, RabbitMQ, Presidio and Caddy with docker compose: `opas-infra/server/README.md`. S3, Textract, SES and Bedrock stay on AWS (pay per use). The ECS stack in `opas-infra/cloudformation` is for later; its first deploy failed because the GitHub deploy role has no CloudFormation permissions, and it needs the database, Redis, RabbitMQ and Presidio to exist.
- [ ] ~~**Bedrock access**~~ **Deferred (11 Nov 2026):** the beta uses the Anthropic API instead (§4 decisions). Every Anthropic model on Bedrock still returns "not available for this account"; revisit when there's budget.
- [ ] **Anthropic account:** billing set up and a monthly spend limit; `ANTHROPIC_API_KEY` set on the server; sign Anthropic's DPA (data processing addendum) and note its transfer mechanism and retention period in the privacy policy (`compliance/DPIA.md`).

- [ ] **DNS and email:** `getopas.app` and `api.getopas.app` live over HTTPS. SES domain verified with SPF, DKIM and DMARC. GitHub variable `MAIL_FROM` not still `opas.fi`.
- [ ] **Link verification files:** Apple Team ID and Play SHA-256 filled in under `opas-infra/web/.well-known/`, served from getopas.app as `application/json`. Both files are now published from `docs/.well-known/` with placeholders; fill them in with `python3 scripts/wellknown.py --apple-team-id … --android-sha256 …` and run `--check` before a release. **Needs a paid Apple Developer account and a Play Console account.** Until then a tapped email link lands on `/d/<id>`, which offers an "Open in Opas" button plus the early-test link.
- [x] **AI provider and data residency (decided: Bedrock; superseded 11 Nov 2026 by the Anthropic API for the beta, see §4).** Claude runs on Amazon Bedrock in eu-north-1 (Stockholm), the same region as the app. Bedrock's Messages endpoint serves only the region it's called in, so letter text stays in Sweden. This was a GDPR / data transfer question, not an EU AI Act one. **Still to do (AWS console):**
  - enable access to Claude Sonnet 5.5 and Claude Sonnet 5 in Amazon Bedrock in eu-north-1;
  - check that both models are offered on Bedrock's Messages endpoint (bedrock-mantle) there;
  - deploy the CloudFormation stack, which gives the task role `bedrock-mantle:CreateInference`.
- [ ] **Opas Presidio image in production:** deploy `opas-infra/presidio` wherever production Presidio runs, then set the GitHub variable `PRESIDIO_LANGUAGES` to `en,fi,sv` and redeploy the stack. Until then letters are analysed in English (dates are already kept).
- [ ] **Database hosting documented:** the repo's CloudFormation doesn't create the PostgreSQL database. State the provider, region and backup policy for the privacy policy.
- [ ] **App store metadata:** create the apps in App Store Connect and Play Console with the ID `app.getopas`. **Blocked: neither developer account is paid for yet, and both link-verification files depend on them.** Prepare localised listings and screenshots. The App Privacy / Data Safety answers must match the consent screen.
- [ ] **EAS credentials** for `app.getopas`, including the iOS push (APNs) key.
- [ ] **Merge PR #11, deploy, and make a new build.** Production deploys only from `main`.

---

## 5. Phased product roadmap

### V1 — Beta and core single-letter utility

**Goal:** validate product-market fit, unblock testing on iOS and Android, keep personal data out of what the AI sees, and deliver instant clarity on a single letter.

- [x] **P0-1. Test on physical devices.** Camera and PDF import, consent screen, iOS Premium screens, email links, layouts.
- [x] **P0-2. Privacy policy.** Data processing, retention periods, and what's sent to the AI. Must name every processor: AWS, Anthropic, Stripe, PostHog, Sentry, Expo push, and the database host.
- [x] **P0-3. AI data residency.** Confirm against Anthropic's own documentation where API data is processed and kept. If it isn't the EU, move to Claude on AWS Bedrock in an EU region. If the processing changes, update the consent text (`consent.point_ai`), bump `VERSION` in `src/lib/aiConsent.ts`, and update the privacy policy.
  **Done (Bedrock):**
  - `AI_PROVIDER=bedrock`, `BEDROCK_REGION=eu-north-1`; credentials come from the ECS task role.
  - Bedrock has no server-side refusal fallback, so a refused request is retried once on Claude Sonnet 5.
  - The consent text now says Claude runs on Amazon Bedrock in Stockholm, and the consent version is v2, so everyone is asked again.
  - `AI_PROVIDER=anthropic` switches back.
  - **The privacy policy needs updating:** Anthropic is no longer a direct processor of letter text; AWS (Bedrock, Stockholm) is.
- [x] **P0-4. Finnish name, address and ID redaction, on the server for V1.** Photos are read by Textract on the server, so there's no text on the phone to redact yet. On-device redaction (`src/lib/redact.ts`) only becomes possible together with on-device OCR ([P2-2](#v3--b2b-distribution-and-platform-infrastructure)). For V1:
  - run Presidio in `fi`/`sv` with a Finnish model, or add recognisers for Finnish names, street addresses and postcodes;
  - keep the existing henkilötunnus regex (`PresidioService.java`).

  **Done when** a test set of 20 sample Kela, Vero and Migri letters (with made-up data) sends no names, ID codes or addresses to the AI.

  **Done:**
  - Presidio requests now include patterns for street addresses, postcode + town, Finnish mobile and +358 numbers, and the account holder's own name with Finnish case endings (`PresidioService.java`).
  - 20 sample letters (`opas-backend/src/test/resources/redaction/sample-letters.txt`) all pass, including that reference numbers, dates and amounts are kept. The same patterns were checked in Python, which Presidio uses.
  - **Found and fixed:** Presidio was asked for every entity type, which also removed **dates** (deadlines never reached Claude) and tagged "Kela" as a nationality. Opas now asks only for personal data types, and authority names are never removed.
  - **Finnish and Swedish language models:** `opas-infra/presidio` is Presidio 2.2.362 plus Finnish and Swedish spaCy models. Each letter is analysed in its own language, which catches other people's names (case workers, family members).
  - **Tested** in the image setup: 7 letters in Finnish, Swedish and English, plus the 20 sample letters, all pass. Infra CI runs the same check.
  - **To go live:** deploy the image and set `PRESIDIO_LANGUAGES=en,fi,sv` (see §4).
- [x] **P0-5. Free draft replies during the beta.** A backend flag (e.g. `opas.beta.free-drafts`) skips the Premium check in `DraftLetterService.java`, and the app shows the draft button when the flag is on. iOS can't sell Premium yet, so without this iPhone testers never see replies.
  **Done:** `DRAFTS_FREE_FOR_EVERYONE` (default `true`). The usage endpoint returns `draftsIncluded`, and the app shows the draft button from it. Fixed on the way: drafts used to send the raw file bytes to Claude, unredacted.
- [ ] **P0-6. Native-speaker review** of UI text and prompts in **Finnish and Swedish**. The app ships in both, and the consent and disclaimer texts were written without a native speaker. Also check the English for plain-language clarity.
- [x] **P0-7. Translated server push notifications.** Local deadline reminders on the phone are already translated. The **server** pushes ("pending documents", weekly summary in `DeadlineReminderService.java`) are hard-coded in English. Use the user's language, as `ResultReadyNotifier` already does. **Done:** English, Finnish and Swedish, with singular and plural forms.
- [x] **P0-8. Update the README.** The app does have unit tests (`src/lib/__tests__`), and deadline reminders already run on the phone. Remove the outdated "What's missing" items and add PDF import, consent and the iOS Premium rule.

### V2 — Case-aware copilot and monetisation

**Goal:** go from single letters to ongoing cases, improve retention, and start charging.

- [ ] **P1-1. "Share to Opas".** An iOS Share Extension (`@bacons/apple-targets`, as used for the widget) and an Android `SEND` intent for PDFs and images. Import from OmaKela, email attachments, downloads.
- [ ] **P1-2. Explanations in more languages:** Ukrainian, Russian, Arabic and Tagalog. Add an "explain in" setting separate from the app language, and keep replies in the letter's language. Arabic needs right-to-left testing.
- [ ] **P1-3. Urgency labels:** *Immediate action*, *Financial deadline*, *Information only*, each with a one-line reason. Never use colour alone.
- [ ] **P1-4. Official source citations:** link explanations to the relevant Kela, Migri, Vero and InfoFinland pages, retrieved from a curated set. Don't state rules we can't cite.
- [ ] **P1-5. "Something's wrong" button:** users flag a wrong deadline or summary (document ID, field and comment, no letter text). Review weekly.
- [ ] **P1-6. In-app purchases on both stores.**
  - **iOS:** StoreKit, e.g. via RevenueCat; then set `CAN_PURCHASE` to true for iOS.
  - **Android (first, decided 10 Nov 2026):** **Stripe in the Android app isn't allowed by default either.** Google Play requires Play Billing for digital subscriptions unless we join its EEA alternative billing or external offers programme, which also requires reporting transactions to Google. Choose between Play Billing (via RevenueCat) and enrolling in the programme. Until then, Android works like iOS: no checkout in the app (`CAN_PURCHASE` is false everywhere).
  - **Backend:** keep entitlements in sync from store webhooks (RevenueCat) and Stripe webhooks for web purchases.
- [ ] **P1-7. Case timelines:**
  - group letters into cases by authority and reference number (*diaarinumero*), helped by the existing pgvector embeddings;
  - track the lifecycle: request → clarification → decision → appeal window;
  - feed the case history into reply drafts, so they refer to earlier submissions.
- [ ] **P1-8. Record consent on the server:** `POST /me/consents` stores the user, consent type, version and time, so we can show GDPR consent.
- [ ] **P1-9. Pricing and tiers in the code (§3):**
  - [x] free quota 5 → 3 (`application.yml`);
  - [x] prices €5.99 / month and €49.99 / year on the Premium screen and website, "Save 30% yearly";
  - [ ] new Stripe prices for €5.99 / €49.99 (the price IDs come from the backend), and move the displayed prices from `app/subscription/index.tsx` to the backend;
  - add the €3.99 Single Case Pass (5 letters + one full reply);
  - [x] Premium feature list: smart deadline reminders added;
  - [x] reminders Premium only: `remindersIncluded` on `/subscription/usage`, `REMINDERS_FREE_FOR_EVERYONE` (default true for the beta); set it to false when Premium goes on sale;
  - [ ] free accounts get explanations in English only, whatever the app language (`readerLanguage` in `DecodeService.java` uses the app language today); other explanation languages are Premium (tell beta testers before it changes);
  - [ ] add deep explanations, full replies, case timelines and dossier export to the list as each one ships;
  - after the beta: short reply for Free, full reply generator for Premium (replaces `DRAFTS_FREE_FOR_EVERYONE`).
- [ ] **P1-10. One B2B pilot,** before building a portal: one employer, university or union, free seats for 3 months for feedback, with simple invite codes. It tests whether B2B buyers exist before P2-1.
- [ ] **P1-11. Deep explanations (Premium):** why the authority decided this, built on the P1-4 sources.
- [ ] **P1-12. Full reply generator (Premium):** tone, counter-arguments, attachment list, references from the case (P1-7).
- [ ] **P1-13. Risk shield (Premium):** for letters with a payment or appeal deadline, what happens if you don't respond and what your options are. Wait for the legal check (§7).
- [ ] **P1-14. Case dossier PDF export (Premium):** one file with a case's letters, explanations, replies and dates.

### V3 — B2B distribution and platform infrastructure

**Goal:** scale through institutions, keep photos on the phone, and connect to the official mail system.

- [ ] **P2-1. B2B portal** for employers and universities: bulk seat allocation and usage reporting. Build it once the P1-10 pilot proves demand.
- [ ] **P2-2. On-device OCR** (Apple Vision / ML Kit): photos are read on the phone and never uploaded. Together with this, move redaction onto the device (`src/lib/redact.ts`), so only redacted text leaves the phone. Matches TiG Desk's privacy model.
- [ ] **P2-3. Official digital mailbox.** There's no public API that lets a third-party app pull someone's Suomi.fi mail. The realistic route is DVV's planned option to choose an approved alternative mail service, which means security certification, an agreement with DVV, and competing with OmaPosti (Posti + Kivra). Start with DVV's requirements once they're published.
- [ ] **P2-4. Nordic expansion:** Sweden (Skatteverket, Försäkringskassan, Migrationsverket) and Norway (NAV, Skatteetaten, UDI). Mostly new content and prompts, not new architecture.
- [ ] **P2-5. Form helper (Premium):** step-by-step guidance for OmaKela and Suomi.fi forms. Guidance next to the form only; Opas never logs in for the user.
- [ ] **P2-6. Household sharing (Premium):** one subscription for a spouse and dependants, each with their own letters and consent.

---

## 6. Beta plan and success metrics

**Setup**
- **Android:** a Google Play closed test with **at least 12 testers opted in for 14 days in a row** (required for new personal developer accounts before production).
- **iOS:** TestFlight.
- **Who:** 20–50 real expats from expat groups, r/Finland and international student unions, mixing the personas in §1 and including Ukrainian and Russian speakers.

**Primary metric (Sean Ellis test):** at least 40% of testers say they'd be "very disappointed" if Opas went away.

**Secondary metrics**

| Metric | Target | Notes |
|---|---|---|
| Draft replies used on letters that need action | > 60% | Needs P0-5 (free drafts in the beta) |
| Personal data reaching the AI | Zero | Checked with the P0-4 redaction test set and beta spot-checks |
| Extracted deadline dates correct | **≥ 95%**, and no wrong date unflagged | The draft said 80%. One wrong deadline in five could cost someone benefits or a permit. Every deadline already says "check against the original", and P1-5 catches errors |
| Testers who scan a second letter within 30 days | > 40% | Retention |
| Testers who allow the consent screen | > 85% | A low number means the screen needs work |

**Interviews:** talk to 5–10 testers about their *last* letter: "What did you do with it before Opas?"

**Go public when** the primary metric is met and V1 is done. If it isn't met, change the product (languages, urgency, replies), not the marketing.

---

## 7. Open questions

| Question | How we'll answer it |
|---|---|
| Anthropic API directly, or AWS Bedrock in the EU? | Check Anthropic's documentation on where data is processed and kept; compare Bedrock EU latency, cost and Claude model availability |
| How to split revenue between subscriptions and one-off packs? | Beta interviews, then conversion data once in-app purchases launch (P1-6, P1-9) |
| €5.99 / €49.99, or the cheaper €4.99 / €39.99? | Beta interviews: ask what they'd pay after their last letter; then test once purchases launch |
| Does the short free reply convert, or just frustrate? | Compare draft use and upgrades after the beta ends free drafts |
| Play Billing, or Google's EEA alternative billing programme, on Android? (Android goes first) | Compare fees and reporting effort (P1-6) |
| Are there restrictions on automated reply drafting for Finnish administrative appeals? | Confirm with a lawyer. We believe there's no general monopoly on legal advice in Finland (only representing people in court is licensed), but get it confirmed before marketing reply drafting for appeals |

---

## 8. Changes from the previous versions

This version uses the team's draft as the base. These changes were made while merging it with the earlier plan:

| Draft said | Changed to | Why |
|---|---|---|
| Bedrock EU "to comply with EU AI Act Article 50" | Data residency is a GDPR / data transfer issue | Article 50 is about transparency (telling people it's AI), which the consent screen and notices already cover |
| P0-4: on-device redaction (`src/lib/redact.ts`) in V1 | Server-side Finnish redaction in V1; on-device redaction moves to V3 with on-device OCR | Photos are read by Textract on the server, so the phone has no text to redact until OCR runs on the device |
| P0-6: Finnish and English review | Finnish **and Swedish**, plus a plain-English check | The app ships in Swedish too |
| P0-7: local push reminders format correctly | Server push notifications translated | Local reminders are already translated; the English-only text is in the server pushes |
| P1-6: activate `CAN_PURCHASE` with StoreKit/Play Billing **and Stripe** | Separate iOS and Android steps, with the Google Play billing rule | Stripe in the Android app needs Google's EEA alternative billing programme; without it, Play Billing is required. The earlier plan was wrong to say Android could keep Stripe |
| Deadline accuracy > 80% | ≥ 95%, no wrong date unflagged | Wrong deadlines are the most harmful mistake Opas can make |
| P2-3: connect to government digital mail APIs | Become an approved alternative mail service under DVV's plan | There's no public API for third parties to pull citizens' Suomi.fi mail |
| April 2026 switch "creates an immediate spike" | Already happened; demand is a hypothesis to test | The switch was on 14 April 2026, and we have no adoption data yet |
| Competitor pricing and features | Kept, marked unverified, with research findings where they differ (e.g. TiG Desk is free) | Couldn't verify from competitors' sites |
| Premium €4.99 / €39.99; credit pack €3.99 for 5 letters (§3) | €5.99 / €49.99; Single Case Pass €3.99 for 5 letters + one full reply; full Free vs. Premium matrix (11 Nov 2026) | Premium has to be a safety net for the whole case, not the free tier without limits |
| Deadline reminders free (10 Nov) | Smart reminders Premium only; deadlines stay visible to everyone (11 Nov) | Reminders are a clear reason to pay; free users keep the deadline list and calendar export |
| — | **Kept from the earlier plan:** personas, market size, PR #11 status, detailed setup steps, beta setup, P1-9 pricing changes in code, P1-10 B2B pilot before the portal, sources | The draft dropped these, and they're still needed to implement or check the plan |

---

## 9. Sources

**Finland: mail, authorities, population**
- [DVV: Official mail becomes digital](https://dvv.fi/en/-/official-mail-becomes-digital-suomi.fi-messages-replaces-paper-mail-from-several-authorities)
- [Suomi.fi: Official mail becomes digital (incl. plan for other digital mail services)](https://www.suomi.fi/news/official-mail-becomes-digital-suomi-fi-messages-replaces-paper-mail-from-several-authorities)
- [Työmarkkinatori: Official mail primarily digital from 14 April](https://tyomarkkinatori.fi/en/news/viranomaisposti-muuttuu-ensisijaisesti-digitaaliseksi-14-4-alkaen)
- [Kela: OmaKela remains main channel](https://www.kela.fi/news/official-mail-from-finnish-authorities-now-primarily-digital-omakela-remains-main-channel-for-mail-from-kela)
- [Kela: customer service (OmaKela languages)](https://www.kela.fi/web/en/customer-service) · [Kela: interpreters](https://www.kela.fi/web/en/interpretation)
- [Posti: Kivra's Finnish business transferred to Posti](https://www.posti.fi/en/latest-news-at-posti/digital_post_20260430)
- [Statistics Finland: Migration 2025](https://stat.fi/en/publication/cmfkx2ozsl54w07w0x1ebt9jj) · [Migri: Immigration statistics 2025](https://migri.fi/en/-/immigration-statistics-2025-immigration-to-finland-decreasing)
- [UEF: image-based machine translation with newcomers](https://blogs.uef.fi/hugi/?p=1793)
- [TEK: information about Finland for members](https://tek.fi/en/services-and-benefits/work-life-in-finland/information-about-finland)

**Competitors**
- [BriefKlar](https://www.briefklar.app/) · [Foldy](https://foldy.ai/) · [TiG Desk](https://talentsingermany.de/tig-desk) · [Amtli](https://www.amtli.app/) · [DocuPilot](https://docupilot.net/)
- [Advocat: letter from Migri](https://advocat.ee/blog/en/letter-from-migri-finland.html) · [LetterHelp](https://letterhelp.eu/) · [FinnPermit](https://finnpermit.com/)

**App stores, billing and regulation**
- [Apple: updated App Review Guidelines (5.1.2(i), third-party AI)](https://developer.apple.com/news?id=ey6d8onl) · [TechCrunch coverage](https://techcrunch.com/2025/11/13/apples-new-app-review-guidelines-clamp-down-on-apps-sharing-personal-data-with-third-party-ai)
- [Daring Fireball: Apple and EU agree DMA payment terms](https://daringfireball.net/2026/08/apple_eu_business_terms_conceding_little) · [AppleMagazine: EU App Store fees](https://applemagazine.com/eu-app-store-fees-dma-settlement/)
- [Google Play: alternative billing for users in the EEA](https://support.google.com/googleplay/android-developer/answer/12348241?hl=en) · [Android Authority: Google Play billing changes](https://www.androidauthority.com/google-play-billing-changes-3681025/) · [Adapty: Google Play subscription fees](https://adapty.io/blog/google-play-billing-changes-subscriptions-fees/)
- [Google Play: testing requirements for new personal accounts](https://support.google.com/googleplay/android-developer/answer/14151465?hl=en) · [TestersCommunity guide](https://www.testerscommunity.com/guides/how-many-testers-do-you-need-google-play)
- [CSA: EU AI Act Article 50 transparency](https://labs.cloudsecurityalliance.org/research/csa-research-note-eu-ai-act-article-50-transparency-20260729/)
- [Heuking: Claude, data protection and compliance](https://www.heuking.de/en/news-events/newsletter-articles/detail/anthropic-claude-in-the-enterprise-data-protection-and-compliance-requirements-for-the-use-of-generative-ai.html) · [Lingaro: Claude data residency](https://lingarogroup.com/insights/claude-data-residency-and-compliance-explained)

Many of these are secondary sources. Check anything with legal or money consequences against the primary source before acting on it.
