# Opas launch plan

What we decided about why people would use Opas, who it competes with, what has to happen before launch, and what to build next. Each work item says what to do, why, where in the code, and how we know it's done.

Last updated: 10 November 2026

---

## Contents

1. [Where we are](#1-where-we-are)
2. [Why anyone would use Opas](#2-why-anyone-would-use-opas)
3. [The market](#3-the-market)
4. [Competitors](#4-competitors)
5. [Who pays](#5-who-pays)
6. [Already done (PR #11)](#6-already-done-pr-11)
7. [Setup outside the code](#7-setup-outside-the-code)
8. [Before the beta (P0)](#8-before-the-beta-p0)
9. [The beta](#9-the-beta)
10. [During and after the beta (P1)](#10-during-and-after-the-beta-p1)
11. [Later (P2)](#11-later-p2)
12. [Open questions](#12-open-questions)
13. [Sources](#13-sources)

---

## 1. Where we are

- **The product works.** Scan, decode, PII removal, draft replies, deadline reminders on the phone, search, folders, Stripe, account deletion, CI.
- **The launch blockers are fixed in [PR #11](https://github.com/GCremez/opas-monorepo/pull/11):** PDF import, the AI consent screen, the AI disclaimers, no Stripe on iOS, the getopas.app domain and the `app.getopas` app ID. They're not tested on a device yet.
- **Plan:** closed beta first, then a public launch. Don't run a paid public launch until the beta shows people come back and would pay.

---

## 2. Why anyone would use Opas

### Translation isn't the competitor. ChatGPT is.

Google Translate and Lens give people the words. Translation was never the hard part. Knowing what a letter means for *you* is. But anyone can photograph a Kela letter, upload it to ChatGPT, and get roughly what Opas gives today, for free. **Explaining a letter isn't something people will pay for.** Opas has to win on what a general chatbot doesn't do:

| What the user needs | ChatGPT today | Where Opas wins |
|---|---|---|
| Understand this one letter | Good enough | Not a reason to pay |
| Remember my case (the 3rd Migri letter refers to the 1st) | Forgets unless the user manages it | A timeline per case |
| Don't miss the deadline | Doesn't know when it is | Pulls the date out, reminds 7 days, 1 day and the morning of; adds it to the calendar |
| Is this scary or routine? | Hedges | A clear urgency label |
| Reply in proper Finnish | Can, but the user can't check it | Replies grounded in how Kela and Migri expect them, with which attachments to include |
| Privacy | A US chatbot gets my residence permit decision | PII removed first, stored in the EU, and we say plainly where the text goes |
| Finland-specific accuracy | Sometimes makes up rules | Answers grounded in Kela, Migri and Vero sources, with citations |

### The message

Sell peace of mind, not AI:

> **Never miss a Kela or Migri deadline. Know if it's urgent. Reply in perfect Finnish.**

Lead with the fear ("I can't lose my benefits or my permit over a misread letter"), not with scanning or AI.

### Personas

| Persona | Real worry | Would they pay? | What it means for us |
|---|---|---|---|
| **Specialist on a work permit** (e.g. an engineer in Helsinki) | Migri: extensions, hearing letters, family reunification | **Yes**, but rarely. Few letters, each high-stakes | Offer a one-off "Migri letter" purchase, not only a monthly plan |
| **Ukrainian family** (second-largest, fast-growing group) | Lots of Kela letters, tight money | No, and **Opas doesn't explain in Ukrainian or Russian** | More explanation languages is the biggest growth lever |
| **International student** | Vero tax card, DVV, Migri renewals | No, price-sensitive | Reach them free, paid for by the university |
| **Expat 3+ years in** | Already knows the system | Will churn | Keep them as the place their records live ("find my 2024 tax decision") |

### The current pricing doesn't sell Premium

The free plan gives 5 decodes a month. Most people get fewer than 5 official letters a month, so **the free plan covers almost everyone**. See [P1-6](#p1-6-change-the-pricing).

---

## 3. The market

- **Official mail went digital on 14 April 2026.** Authorities now send to Suomi.fi Messages by default, and Kela's main channel is OmaKela. Kela alone sends 14+ million documents a year. Paper is now the exception, so **many letters arrive as PDFs, not paper.** PDF import is in PR #11; a share-sheet extension is [P1-1](#p1-1-share-to-opas-from-other-apps).
- **OmaKela is Finnish and Swedish only.** English speakers open their letters in an interface they can't read.
- **DVV plans to let people choose another digital mailbox** for official mail, if it meets the security requirements. An "expat mailbox" that receives and explains official mail would be a real moat. The incumbent is big: **Posti took over Kivra's Finnish business in April 2026** and is merging it into OmaPosti. See [P2-2](#p2-2-become-an-official-digital-mailbox).
- **Market size:** about 51,000 people moved to Finland in 2025, and about 11% of residents have a foreign background. Estonians, Ukrainians, Russians and Iraqis are among the largest groups. As a consumer-only app this is a small market. With B2B channels or other Nordic countries, it gets interesting.
- **Free help already exists:** Kela offers free interpreters if you don't understand a letter, and has a chatbot. InfoFinland, municipal advice points and unions help too. All free, but slow and only open in office hours.

---

## 4. Competitors

Nobody clearly owns Finland yet. Germany is further along, and shows where this category is heading.

### In Finland (small and early)

| Product | What it does | Threat |
|---|---|---|
| **Advocat** (advocat.ee) | Upload a Migri letter, get an explanation in your language | Medium. Migri only |
| **LetterHelp** (letterhelp.eu) | AI drafting for Kela appeals, Migri letters, rent disputes | Low–medium. Replies, not understanding |
| **FinnPermit** (finnpermit.com) | Q&A on immigration rules | Low. No letters |

### In Germany (crowded: a preview of what's coming)

| Product | What it does | Why it matters |
|---|---|---|
| **BriefKlar** | 6 countries (DE, FR, IT, ES, NL, PL), 35+ languages, reply drafting, free tier of 3 letters a month | **Biggest threat.** Already multi-country, and Finland is an obvious next step |
| **Foldy** | Plain-language next steps, 5 languages including Ukrainian, Claude via AWS Bedrock in the EU | Shows the EU-hosting setup we should copy |
| **TiG Desk** | Free; OCR on the phone, so the image never leaves the device | Sets the privacy bar |
| **Amtli**, **DocuPilot** | Similar letter explainers | Explaining letters is already a commodity there |

**Takeaway:** competition is on **number of languages, privacy and reply quality**, and some apps give explaining away free. Don't plan around being the only one.

We couldn't open the competitors' sites from the research session, so prices and user numbers weren't verified. The details above come from search results and the companies' own descriptions.

---

## 5. Who pays

People pay **when something scary arrives**, not every month. Two models to test:

1. **Consumers:** a free plan for understanding letters, and paid for replies, case tracking and one-off high-stakes letters (e.g. a "Migri letter pack" for €9–15).
2. **B2B2C, where someone else pays for the expat.** This is probably the stronger model:
   - **Employers and relocation firms** hiring internationally (Finland's Talent Boost and Work in Finland push this). Pitch: "Your new hire spends less time confused by Migri and Vero." Sold per seat.
   - **Universities**, for international students. Fits their retention goals.
   - **Trade unions** (TEK and the Akava unions) with many international members. Opas as a member benefit.
   - **Municipal immigrant services**, swamped with "what does this letter mean" questions.

Run one B2B pilot before spending on consumer ads ([P1-8](#p1-8-one-b2b-pilot)).

---

## 6. Already done (PR #11)

| Change | Why | Where |
|---|---|---|
| Domain → `getopas.app` (site, privacy, help, Stripe return pages, email links); API `api.getopas.app`; email from `no-reply@getopas.app` | New domain | `application.yml`, `eas.json`, `profile.tsx`, `cloudformation/ecs.yml`, `infra-ci.yml` |
| Email links (`getopas.app/d/<id>`) open the app | They opened a browser before | `opas-mobile/app.json` (associated domains, intent filters), `opas-infra/web/.well-known/` |
| App ID → `app.getopas`, App Group → `group.app.getopas` | Matches a domain we own; can only change before the first store release | `app.json`, widget Swift files |
| PDF import on the scan screen, 20 MB limit checked up front | Mail is digital now | `app/(tabs)/scan.tsx` |
| AI consent screen before the first upload: names Anthropic, says the text may be processed in the US | App Store guideline 5.1.2(i), and honesty | `src/components/AiConsent.tsx`, `src/lib/aiConsent.ts` |
| "AI can make mistakes / not legal advice" on decoded letters, the scan result and draft replies | Users' safety, liability, EU AI Act transparency | `document/[id].tsx`, `scan.tsx`, `draft/[id].tsx` |
| No prices, checkout or upgrade buttons on iOS; Premium users keep everything | App Store guideline 3.1.1 (no Stripe for digital goods in an iOS app) | `src/lib/billing.ts` (`CAN_PURCHASE`) |

Checks run: backend tests for the domain pass, `tsc` passes, no new lint warnings. **Not yet tested on a device.**

---

## 7. Setup outside the code

These are manual. The app won't work on the new domain or the new app ID until they're done.

- [ ] **DNS**: `getopas.app` → website host; `api.getopas.app` → AWS load balancer. `.app` domains are HTTPS-only.
- [ ] **TLS**: ACM certificate for `api.getopas.app` in eu-north-1; update the GitHub variable `INFRA_CERT_ARN`.
- [ ] **Email (SES)**: verify `getopas.app`; add DKIM, SPF and DMARC. Check the GitHub variable `MAIL_FROM` isn't still `opas.fi`. Test: a verification code to Gmail lands in the inbox and shows SPF, DKIM and DMARC all PASS.
- [ ] **AWS env vars**: if `APP_LINK_BASE_URL` or `STRIPE_RETURN_BASE_URL` are set, update them.
- [ ] **Website pages**: `/privacy`, `/help`, `/subscription/success`, `/subscription/cancel`, and a `/d/<id>` fallback for people without the app. See `opas-infra/web/README.md`.
- [ ] **Link verification files**: fill in `APPLE_TEAM_ID` and the Play signing SHA-256 in `opas-infra/web/.well-known/`, and serve them as `application/json` with no redirect.
- [ ] **App Store Connect**: create the app with the bundle ID `app.getopas`; privacy policy and support URLs on getopas.app; App Privacy answers that match the consent screen.
- [ ] **Play Console**: create the app with the package `app.getopas`; Data Safety form that matches the consent screen.
- [ ] **EAS credentials** for the new ID, including the iOS push notification (APNs) key.
- [ ] **Merge PR #11**, deploy (production deploys only from `main`), and make a new EAS build. Old builds still point to `api.opas.app`.

Check commands:

```bash
curl -I https://getopas.app && curl -I https://api.getopas.app
for p in privacy help subscription/success subscription/cancel; do
  curl -s -o /dev/null -w "$p %{http_code}\n" https://getopas.app/$p; done
curl -sI https://getopas.app/.well-known/apple-app-site-association | grep -iE "^HTTP|content-type|location"
curl -s  https://getopas.app/.well-known/assetlinks.json
```

---

## 8. Before the beta (P0)

### P0-1. Test PR #11 on real phones
- **Do:** run a development build on an iPhone and an Android phone. Try:
  - the consent screen: allow, and "not now";
  - PDF import, including a 21 MB file;
  - the iOS Premium screens: no prices, no upgrade buttons;
  - an email link opening the app.
- **Done when:** each flow works on both platforms, and any bugs are fixed.

### P0-2. Write the privacy policy
- **Why:** both stores require one, and GDPR requires it to be accurate. It must match the consent screen.
- **Must say:**
  - which data we collect: account, letters, extracted text, usage analytics (PostHog), crash reports (Sentry);
  - processors: AWS (S3 in Stockholm, Textract in Frankfurt, SES), wherever the PostgreSQL database runs (the CloudFormation in this repo doesn't create it, so state the provider and region), Anthropic (US processing, not used for training), Stripe, PostHog, Sentry, Expo's push service;
  - the legal basis for each;
  - how long we keep data, and that people can delete it themselves (in-app account deletion removes everything);
  - contact details.
- **Done when:** it's live at `getopas.app/privacy`, in English, Finnish and Swedish.

### P0-3. Decide: Anthropic API directly, or Claude through AWS Bedrock in the EU
- **Why:** today the backend calls Anthropic's API directly (`opas-backend/pom.xml`, `anthropic-java`). Secondary sources say that API processes data in the US with no guaranteed EU option. **Confirm that against Anthropic's own documentation first.** We're already on AWS, and Bedrock in an EU region keeps letter text in the EU, which is what Foldy does.
- **If we switch:**
  - change the AI client to Bedrock (Spring AI Bedrock Converse, or the AWS SDK) in an EU region that has the Claude model we use;
  - give the ECS task role permission to call Bedrock;
  - update the consent text (`consent.point_ai` in `opas-mobile/src/i18n/*.json`) and bump `VERSION` in `src/lib/aiConsent.ts` so everyone is asked again;
  - update the privacy policy.
- **Done when:** decided; if switching, decodes and drafts run through Bedrock in the EU and the copy says so.

### P0-4. Catch Finnish names and addresses before the AI sees them
- **Why:** Presidio runs in English mode (`PRESIDIO_LANGUAGE=en`). It catches the henkilötunnus (a regex is in place in `PresidioService.java`), but Finnish names and street addresses can slip through, while the consent screen says details are removed "wherever we find them".
- **Do:** add a Finnish spaCy model to the Presidio analyzer (or recognizers for Finnish addresses and postcodes, plus a list of common Finnish first and last names), and run the analyzer in `fi` for Finnish letters and `sv` for Swedish ones.
- **Done when:** a test set of 20 real-looking Kela, Vero and Migri letters (with made-up personal data) shows no names, ID codes or addresses in the text sent to the AI.

### P0-5. Make draft replies free during the beta
- **Why:** replies are a key differentiator and Premium-only. iOS can't sell Premium yet, so iPhone beta users never see them. The beta needs to show whether people value replies.
- **Do:** add a backend flag (e.g. `opas.beta.free-drafts`) that skips the Premium check in `DraftLetterService.java`. In the app, show the draft button when the flag is on: expose it via `/subscription` or a small `/config` endpoint and use it next to `CAN_PURCHASE` in `document/[id].tsx` and `draft/[id].tsx`.
- **Done when:** with the flag on, a free iPhone user can draft a reply; with it off, the behaviour is unchanged.

### P0-6. Have native speakers review the Finnish and Swedish
- **Why:** the new strings in PR #11 (consent, disclaimers, PDF, iOS Premium) were written without a native speaker. People are asked to trust them with legal letters.
- **Files:** `opas-mobile/src/i18n/fi.json`, `sv.json` (the `consent` section and the new keys in `scan`, `document`, `draftLetter`, `subscription`).

### P0-7. Translate the server-side push notifications
- **Why:** the daily "pending documents" and weekly summary pushes are hard-coded in English (`DeadlineReminderService.java`), while the app and emails come in three languages.
- **Do:** use the user's language, as `ResultReadyNotifier` already does.

### P0-8. Update the README
- **Why:** "What's missing" is out of date. Deadline reminders already run on the phone (`opas-mobile/src/lib/reminders.ts`: 7 days, 1 day and the morning of), and the app has unit tests (`src/lib/__tests__`).
- **Also add:** PDF import, the consent screen and the iOS Premium rule.

---

## 9. The beta

**Setup**
- **Android:** Google Play requires new personal developer accounts to run a closed test with **12+ testers opted in for 14 days in a row** before going to production. Use that as the beta.
- **iOS:** TestFlight.
- **Who:** 20–50 real expats from expat Facebook groups, r/Finland, international student unions, and people you know. Aim for a mix of the personas above, including at least a few Ukrainian or Russian speakers, to test the language gap.

**What to measure** (PostHog events already exist for scans, consent and checkout)

| Question | Signal | Good |
|---|---|---|
| Do they come back? | A second letter scanned within 30 days | > 40% of active testers |
| Do they finish setup? | `ai_consent_granted` ÷ people who opened the scan screen | > 85% |
| What do they use? | Draft replies started, deadlines added to the calendar, tasks ticked off | Replies used by > 25% |
| Is it a must-have? | "How disappointed would you be if Opas disappeared?" | ≥ 40% say "very" |
| Would they pay? | "Would you pay €X for the next Migri letter?" / a monthly plan | Clear willingness at some price |
| Is it accurate? | Testers report wrong dates or amounts (add a "Something's wrong" button, see P1-7) | Zero wrong deadlines |

**Interviews:** talk to 5–10 testers. Ask about their *last* letter: "What did you do with it before Opas?" That says more than any survey.

**Go public when** the "good" column is mostly met and P0 is done. If not, change the product (languages, urgency, replies), not the ads.

---

## 10. During and after the beta (P1)

Ordered by expected value.

### P1-1. "Share to Opas" from other apps
- **Why:** letters live in OmaKela, Suomi.fi and email. Sharing straight into Opas beats "save the PDF, open Opas, find the file".
- **Do:** an iOS Share Extension (the repo already uses `@bacons/apple-targets` for the widget) and an Android `SEND` intent filter for `application/pdf` and `image/*`, both handing off to the scan upload flow.
- **Done when:** Share → Opas from the Files app and from a mail attachment opens Opas and decodes the letter.

### P1-2. Explanations in more languages
- **Why:** the largest and most stressed groups (Ukrainian, Russian, Arabic, and others) are left out. BriefKlar offers 35+ languages.
- **Do:**
  1. Let people choose the language the AI explains *in*, separately from the app's own language. Add an "explain in" setting, pass it to the decode prompt, and keep replies in the letter's language.
  2. Then add app interface languages: Ukrainian and Russian first, then Arabic (right-to-left layout needs testing).
- **Done when:** a Ukrainian user gets the summary, key details and actions in Ukrainian.

### P1-3. Urgency label on every letter
- **Why:** "Is this scary or routine?" is the first thing people want to know.
- **Do:** add an `urgency` field (`info` / `action_needed` / `urgent`) and a one-line reason to the decode JSON. Show it at the top of the scan result and the document, and sort Home by it. Never use colour alone.
- **Done when:** an information-only letter says "No action needed", and a request for clarification with a deadline says "Urgent: reply by …".

### P1-4. Case timelines that link letters together
- **Why:** this is what ChatGPT can't do. The third Migri letter makes sense only next to the first.
- **Do:** use the existing pgvector embeddings plus extracted reference numbers (diary or case numbers) and the authority to suggest "This looks like a follow-up to your 12 Feb application". The user confirms, and letters are grouped into a case with a timeline.
- **Done when:** two related test letters are suggested as one case, and the case page shows them in order.

### P1-5. Answers grounded in Finnish sources, with citations
- **Why:** accuracy, trust, and something general chatbots don't do.
- **Do:** build a small curated set of official guidance (Kela, Migri, Vero and InfoFinland pages on common letter types: appeal periods, requests for clarification, hearing letters). Retrieve the relevant pages during decode, and show "Source: kela.fi/…" under the next steps.
- **Done when:** the most common letter types show at least one official source, and the AI doesn't state rules it can't cite.

### P1-6. Change the pricing
- **Why:** 5 free decodes a month covers almost everyone (see §2).
- **Try:**
  - understanding stays free;
  - Premium covers replies, case timelines, urgency alerts and unlimited history search;
  - a one-off pack for high-stakes letters (e.g. Migri).

  Prices are currently hard-coded in `app/subscription/index.tsx` (€4.99 / €47.90). Move them to the backend's plan list.
- **Done when:** the beta answers which model people actually pay for.

### P1-7. "Something's wrong" button on decoded letters
- **Why:** a wrong deadline is the worst thing Opas can do. Errors need to be found fast.
- **Do:** a button on the document page that sends the document ID, the field and a comment, with no letter text, to a backend table. Review the reports weekly.

### P1-8. One B2B pilot
- **Why:** someone else paying is likely the stronger model (§5).
- **Do:** pick one employer, university or union. Offer free seats for 3 months in return for feedback and a renewal conversation. This needs simple invite codes or org-paid accounts on the backend.
- **Done when:** one signed pilot, with usage numbers at the end.

### P1-9. In-App Purchase on iOS
- **Why:** iOS can't sell Premium until this exists.
- **Do:** RevenueCat (or StoreKit directly), with the backend kept in sync through RevenueCat webhooks, mirroring the Stripe webhook design. Then set `CAN_PURCHASE` in `src/lib/billing.ts` to true for iOS. In the EU, compare Apple's fees (from 1 Oct 2026: about 26% for in-app purchase, about 15% for a link to the web) before choosing.
- **Done when:** the beta shows people will pay (P1-6), and an iPhone user can subscribe and get Premium on all their devices.

### P1-10. Record consent on the server
- **Why:** consent is stored only on the device (`src/lib/aiConsent.ts`). Under GDPR we should be able to show when someone agreed, to which version.
- **Do:** a `POST /me/consents` endpoint storing the user, consent type, version and time. Call it when "Allow" is tapped, and skip the screen if the server already has the current version.

---

## 11. Later (P2)

### P2-1. Other Nordic countries
Sweden, Norway and Denmark have the same pattern: digital official mail in the local language, and many international workers. The system is built around per-authority knowledge, so each country is mostly content and prompts, not new architecture.

### P2-2. Become an official digital mailbox
DVV plans to let people choose another digital mailbox for official mail. An Opas mailbox that receives letters and explains them automatically would be a moat. It's heavy: security certification, an agreement with DVV, and competing with OmaPosti (Posti + Kivra). Revisit after product-market fit.

### P2-3. Read the text on the phone
TiG Desk reads the image on the device, so the photo never leaves the phone. On-device OCR (Apple Vision / ML Kit) would let photos stay on the phone, with only the redacted text sent. That's a stronger privacy story.

---

## 12. Open questions

| Question | How we'll answer it |
|---|---|
| Anthropic directly, or Bedrock in the EU? | P0-3: check Anthropic's documentation on where data is processed |
| Monthly plan, one-off packs, or B2B? | Beta interviews + P1-6 + P1-8 |
| Which explanation languages first? | Beta sign-ups: ask testers which language they want |
| Is Opas a must-have? | The beta "very disappointed" score (target ≥ 40%) |
| Does any rule restrict giving legal advice in Finland? | We believe Finland has no general monopoly on legal advice (only representing people in court is licensed), but confirm with a lawyer before marketing reply drafting for appeals |

---

## 13. Sources

**Finland: mail, authorities, population**
- [DVV: Official mail becomes digital](https://dvv.fi/en/-/official-mail-becomes-digital-suomi.fi-messages-replaces-paper-mail-from-several-authorities)
- [Suomi.fi: Official mail becomes digital (incl. plan for other digital mail services)](https://www.suomi.fi/news/official-mail-becomes-digital-suomi-fi-messages-replaces-paper-mail-from-several-authorities)
- [Työmarkkinatori: Official mail primarily digital from 14 April](https://tyomarkkinatori.fi/en/news/viranomaisposti-muuttuu-ensisijaisesti-digitaaliseksi-14-4-alkaen)
- [Kela: OmaKela remains main channel](https://www.kela.fi/news/official-mail-from-finnish-authorities-now-primarily-digital-omakela-remains-main-channel-for-mail-from-kela)
- [Kela: customer service (OmaKela languages)](https://www.kela.fi/web/en/customer-service)
- [Kela: interpreters](https://www.kela.fi/web/en/interpretation)
- [Posti: Kivra's Finnish business transferred to Posti](https://www.posti.fi/en/latest-news-at-posti/digital_post_20260430)
- [Statistics Finland: Migration 2025](https://stat.fi/en/publication/cmfkx2ozsl54w07w0x1ebt9jj)
- [Migri: Immigration statistics 2025](https://migri.fi/en/-/immigration-statistics-2025-immigration-to-finland-decreasing)
- [UEF: image-based machine translation with newcomers](https://blogs.uef.fi/hugi/?p=1793)
- [TEK: information about Finland for members](https://tek.fi/en/services-and-benefits/work-life-in-finland/information-about-finland)

**Competitors**
- [BriefKlar](https://www.briefklar.app/) · [Foldy](https://foldy.ai/) · [TiG Desk](https://talentsingermany.de/tig-desk) · [Amtli](https://www.amtli.app/) · [DocuPilot](https://docupilot.net/)
- [Advocat: letter from Migri](https://advocat.ee/blog/en/letter-from-migri-finland.html) · [LetterHelp](https://letterhelp.eu/) · [FinnPermit](https://finnpermit.com/)

**App stores and regulation**
- [Apple: updated App Review Guidelines (5.1.2(i), third-party AI)](https://developer.apple.com/news?id=ey6d8onl) · [TechCrunch coverage](https://techcrunch.com/2025/11/13/apples-new-app-review-guidelines-clamp-down-on-apps-sharing-personal-data-with-third-party-ai)
- [Daring Fireball: Apple and EU agree DMA payment terms](https://daringfireball.net/2026/08/apple_eu_business_terms_conceding_little) · [AppleMagazine: EU App Store fees](https://applemagazine.com/eu-app-store-fees-dma-settlement/)
- [Google Play: testing requirements for new personal accounts](https://support.google.com/googleplay/android-developer/answer/14151465?hl=en) · [TestersCommunity guide](https://www.testerscommunity.com/guides/how-many-testers-do-you-need-google-play)
- [CSA: EU AI Act Article 50 transparency](https://labs.cloudsecurityalliance.org/research/csa-research-note-eu-ai-act-article-50-transparency-20260729/)
- [Heuking: Claude, data protection and compliance](https://www.heuking.de/en/news-events/newsletter-articles/detail/anthropic-claude-in-the-enterprise-data-protection-and-compliance-requirements-for-the-use-of-generative-ai.html) · [Lingaro: Claude data residency](https://lingarogroup.com/insights/claude-data-residency-and-compliance-explained)

Many of these are secondary sources (blogs and news coverage). Check anything with legal or money consequences against the primary source before acting on it.
