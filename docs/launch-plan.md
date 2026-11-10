# Opas launch plan

Product positioning, competitors, pricing, setup requirements and the phased roadmap for Opas, the AI assistant that helps international residents understand and act on official Finnish mail.

Last updated: 10 November 2026. [§8](#8-changes-from-the-previous-versions) lists what changed from the earlier versions and why.

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
- **Privacy.** Pasting a whole letter, henkilötunnus included, into a public chatbot exposes sensitive data. Opas removes personal details before the AI sees the text. Finnish names and addresses still need work: see [P0-4](#v1--beta-and-core-single-letter-utility).
- **No workflow.** ChatGPT outputs text. It doesn't track deadlines, link related letters into a case, or keep a structured record.

| What the user needs | ChatGPT today | Where Opas wins |
|---|---|---|
| Understand this one letter | Good enough | Not a reason to pay |
| Remember my case (the 3rd Migri letter refers to the 1st) | Forgets | Case timeline |
| Don't miss the deadline | Doesn't know when it is | Reminders 7 days, 1 day and the morning of; calendar export |
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
| **Foldy** | Germany / EU | B2C subscription, €4–8/mo | Plain-language next steps, 5 languages including Ukrainian, Claude via AWS Bedrock in the EU | Active workflow (replies, case timelines). Foldy's EU hosting is the setup we're evaluating in P0-3 |
| **Advocat / LetterHelp** | Estonia / Finland | Pay per letter, €5–20 per appeal | Disputes, appeals, immigration letters | Instant and cheaper, without a legal consultation |
| **Amtli, DocuPilot** | Germany | Not researched | Letter explainers | Show that explaining letters is already a commodity |
| **FinnPermit** | Finland | Not researched | Immigration Q&A, no letters | Opas works from the user's own letters |

**Takeaway:** the category competes on languages, privacy and reply quality, and some apps give explaining away for free. Don't plan around being the only one.

---

## 3. Revenue and pricing

| Tier | Price | Includes |
|---|---|---|
| **Free** | €0 | **3 scans a month** |
| **Premium** | **€4.99/month or €39.99/year** | Unlimited scans; case timelines; unlimited reply drafts; calendar and push deadline reminders |
| **Credit pack** | **€3.99 for 5 letters** | For occasional users who don't want a subscription |
| **B2B licences** | Per seat | Employers, relocation agencies, universities (and unions) give Opas to new arrivals |

**This isn't what the app does today.** The code still has 5 free decodes and €4.99 / €47.90. See [P1-9](#v2--case-aware-copilot-and-monetisation).

**Note on deadline reminders:** they already run on the phone for every user, free included (`opas-mobile/src/lib/reminders.ts`). Moving them to Premium means removing a working feature from free users. Decide deliberately; keeping them free may be the better retention bet.

---

## 4. Launch setup checklist

**Already done in [PR #11](https://github.com/GCremez/opas-monorepo/pull/11)** (code):
- Domain `getopas.app` (API at `api.getopas.app`, email from `no-reply@getopas.app`).
- Email links open the app.
- App ID `app.getopas`.
- PDF import.
- AI consent screen naming Anthropic.
- "AI can make mistakes / not legal advice" notices.
- No prices or checkout on iOS (`CAN_PURCHASE` in `src/lib/billing.ts`).

**Infrastructure and operations:**

- [ ] **DNS and email:** `getopas.app` and `api.getopas.app` live over HTTPS. SES domain verified with SPF, DKIM and DMARC. GitHub variable `MAIL_FROM` not still `opas.fi`.
- [ ] **Link verification files:** Apple Team ID and Play SHA-256 filled in under `opas-infra/web/.well-known/`, served from getopas.app as `application/json`.
- [ ] **AI provider and data residency:** Anthropic API directly vs. AWS Bedrock in the EU (e.g. eu-central-1, if it has our Claude model). This is a **GDPR / international data transfer** question, not an EU AI Act one. Article 50 is about telling people they're dealing with AI, which the consent screen and AI notices already cover. See P0-3.
- [ ] **Database hosting documented:** the repo's CloudFormation doesn't create the PostgreSQL database. State the provider, region and backup policy for the privacy policy.
- [ ] **App store metadata:** create the apps in App Store Connect and Play Console with the ID `app.getopas`. Prepare localised listings and screenshots. The App Privacy / Data Safety answers must match the consent screen.
- [ ] **EAS credentials** for `app.getopas`, including the iOS push (APNs) key.
- [ ] **Merge PR #11, deploy, and make a new build.** Production deploys only from `main`.

---

## 5. Phased product roadmap

### V1 — Beta and core single-letter utility

**Goal:** validate product-market fit, unblock testing on iOS and Android, keep personal data out of what the AI sees, and deliver instant clarity on a single letter.

- [x] **P0-1. Test on physical devices.** Camera and PDF import, consent screen, iOS Premium screens, email links, layouts.
- [x] **P0-2. Privacy policy.** Data processing, retention periods, and what's sent to the AI. Must name every processor: AWS, Anthropic, Stripe, PostHog, Sentry, Expo push, and the database host.
- [ ] **P0-3. AI data residency.** Confirm against Anthropic's own documentation where API data is processed and kept. If it isn't the EU, move to Claude on AWS Bedrock in an EU region. If the processing changes, update the consent text (`consent.point_ai`), bump `VERSION` in `src/lib/aiConsent.ts`, and update the privacy policy.
- [ ] **P0-4. Finnish name, address and ID redaction, on the server for V1.** Photos are read by Textract on the server, so there's no text on the phone to redact yet. On-device redaction (`src/lib/redact.ts`) only becomes possible together with on-device OCR ([P2-2](#v3--b2b-distribution-and-platform-infrastructure)). For V1:
  - run Presidio in `fi`/`sv` with a Finnish model, or add recognisers for Finnish names, street addresses and postcodes;
  - keep the existing henkilötunnus regex (`PresidioService.java`).

  **Done when** a test set of 20 sample Kela, Vero and Migri letters (with made-up data) sends no names, ID codes or addresses to the AI.
- [ ] **P0-5. Free draft replies during the beta.** A backend flag (e.g. `opas.beta.free-drafts`) skips the Premium check in `DraftLetterService.java`, and the app shows the draft button when the flag is on. iOS can't sell Premium yet, so without this iPhone testers never see replies.
- [ ] **P0-6. Native-speaker review** of UI text and prompts in **Finnish and Swedish**. The app ships in both, and the consent and disclaimer texts were written without a native speaker. Also check the English for plain-language clarity.
- [ ] **P0-7. Translated server push notifications.** Local deadline reminders on the phone are already translated. The **server** pushes ("pending documents", weekly summary in `DeadlineReminderService.java`) are hard-coded in English. Use the user's language, as `ResultReadyNotifier` already does.
- [ ] **P0-8. Update the README.** The app does have unit tests (`src/lib/__tests__`), and deadline reminders already run on the phone. Remove the outdated "What's missing" items and add PDF import, consent and the iOS Premium rule.

### V2 — Case-aware copilot and monetisation

**Goal:** go from single letters to ongoing cases, improve retention, and start charging.

- [ ] **P1-1. "Share to Opas".** An iOS Share Extension (`@bacons/apple-targets`, as used for the widget) and an Android `SEND` intent for PDFs and images. Import from OmaKela, email attachments, downloads.
- [ ] **P1-2. Explanations in more languages:** Ukrainian, Russian, Arabic and Tagalog. Add an "explain in" setting separate from the app language, and keep replies in the letter's language. Arabic needs right-to-left testing.
- [ ] **P1-3. Urgency labels:** *Immediate action*, *Financial deadline*, *Information only*, each with a one-line reason. Never use colour alone.
- [ ] **P1-4. Official source citations:** link explanations to the relevant Kela, Migri, Vero and InfoFinland pages, retrieved from a curated set. Don't state rules we can't cite.
- [ ] **P1-5. "Something's wrong" button:** users flag a wrong deadline or summary (document ID, field and comment, no letter text). Review weekly.
- [ ] **P1-6. In-app purchases on both stores.**
  - **iOS:** StoreKit, e.g. via RevenueCat; then set `CAN_PURCHASE` to true for iOS.
  - **Android:** **Stripe in the Android app isn't allowed by default either.** Google Play requires Play Billing for digital subscriptions unless we join its EEA alternative billing or external offers programme, which also requires reporting transactions to Google. Choose between Play Billing (via RevenueCat) and enrolling in the programme. Until then, treat Android like iOS: no checkout in the app.
  - **Backend:** keep entitlements in sync from store webhooks (RevenueCat) and Stripe webhooks for web purchases.
- [ ] **P1-7. Case timelines:**
  - group letters into cases by authority and reference number (*diaarinumero*), helped by the existing pgvector embeddings;
  - track the lifecycle: request → clarification → decision → appeal window;
  - feed the case history into reply drafts, so they refer to earlier submissions.
- [ ] **P1-8. Record consent on the server:** `POST /me/consents` stores the user, consent type, version and time, so we can show GDPR consent.
- [ ] **P1-9. Pricing in the code:**
  - free quota 5 → 3;
  - yearly price €47.90 → €39.99 (prices are hard-coded in `app/subscription/index.tsx`; move them to the backend);
  - add the €3.99 five-letter credit pack;
  - decide whether deadline reminders stay free (§3).
- [ ] **P1-10. One B2B pilot,** before building a portal: one employer, university or union, free seats for 3 months for feedback, with simple invite codes. It tests whether B2B buyers exist before P2-1.

### V3 — B2B distribution and platform infrastructure

**Goal:** scale through institutions, keep photos on the phone, and connect to the official mail system.

- [ ] **P2-1. B2B portal** for employers and universities: bulk seat allocation and usage reporting. Build it once the P1-10 pilot proves demand.
- [ ] **P2-2. On-device OCR** (Apple Vision / ML Kit): photos are read on the phone and never uploaded. Together with this, move redaction onto the device (`src/lib/redact.ts`), so only redacted text leaves the phone. Matches TiG Desk's privacy model.
- [ ] **P2-3. Official digital mailbox.** There's no public API that lets a third-party app pull someone's Suomi.fi mail. The realistic route is DVV's planned option to choose an approved alternative mail service, which means security certification, an agreement with DVV, and competing with OmaPosti (Posti + Kivra). Start with DVV's requirements once they're published.
- [ ] **P2-4. Nordic expansion:** Sweden (Skatteverket, Försäkringskassan, Migrationsverket) and Norway (NAV, Skatteetaten, UDI). Mostly new content and prompts, not new architecture.

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
| Should deadline reminders become Premium-only? | Beta retention data, comparing testers who use reminders with those who don't |
| Play Billing, or Google's EEA alternative billing programme, on Android? | Compare fees and reporting effort (P1-6) |
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
