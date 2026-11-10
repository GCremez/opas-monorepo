# Opas: AI document assistant for expats in Finland

![Backend CI](https://github.com/GCremez/opas-monorepo/actions/workflows/backend-ci.yml/badge.svg)
![Mobile CI](https://github.com/GCremez/opas-monorepo/actions/workflows/mobile-ci.yml/badge.svg)
![Infra CI](https://github.com/GCremez/opas-monorepo/actions/workflows/infra-ci.yml/badge.svg)

Opas means "guide" in Finnish. It's a mobile app with a Spring Boot backend that helps people who have moved to Finland understand letters from Kela, Vero, Migri and other authorities.

You take a photo of a letter. Opas tells you what it is, what it says in plain English, which dates and amounts matter, and what you need to do next. It can also write a formal reply for you in the same language as the letter. The app is available in English, Finnish and Swedish.

## Demo

<!-- Demo video goes here:
[![Demo video](https://img.youtube.com/vi/VIDEO_ID/maxresdefault.jpg)](https://youtu.be/VIDEO_ID)
-->

### Screen designs

<p align="center">
  <img src="docs/screenshots/home.png" width="190" alt="Home" />
  <img src="docs/screenshots/scan.png" width="190" alt="Scan a letter" />
  <img src="docs/screenshots/document.png" width="190" alt="Decoded letter" />
  <img src="docs/screenshots/draft-reply.png" width="190" alt="Draft reply in Finnish" />
</p>

<p align="center"><em>Home, scan, a decoded letter and a draft reply. More screens, including dark mode, are in <a href="docs/screenshots">docs/screenshots</a>.</em></p>

---

## Contents

- [Why I built it](#why-i-built-it)
- [How it works](#how-it-works)
- [Features](#features)
- [Architecture](#architecture)
- [Tech stack](#tech-stack)
- [The project in numbers](#the-project-in-numbers)
- [Project structure](#project-structure)
- [Running it locally](#running-it-locally)
- [Using the app](#using-the-app)
- [API](#api)
- [Data model](#data-model)
- [Tests](#tests)
- [CI/CD](#cicd)
- [Configuration](#configuration)
- [Security](#security)
- [Decisions I made and why](#decisions-i-made-and-why)
- [What's missing and what's next](#whats-missing-and-whats-next)
- [Author](#author)

---

## Why I built it

If you move to Finland, you start getting official letters almost straight away. Most of them are in Finnish or Swedish and written in very formal language. Translation apps help with the words, but they don't tell you what the letter actually means for you, or what happens if you ignore it.

Missing a Kela deadline or misreading a Migri decision can cost you money or delay your residence permit. I wanted an app that answers three questions for any letter: what is this, what does it say, and what do I need to do.

---

## How it works

1. **Upload.** The app asks the backend for a short-lived upload link and sends the photo or PDF straight to Amazon S3. Big files never pass through the API.
2. **Confirm.** The app tells the backend the upload is done. The backend checks the real file in S3 to make sure the type and size match what the app said.
3. **Queue.** When you tap Decode, the API checks your monthly limit, puts a job on RabbitMQ and returns right away. You don't sit and wait on a slow request.
4. **Read the text.** A background worker downloads the file and pulls the text out. PDFs go through PDFBox. Photos go through AWS Textract.
5. **Remove personal data.** Before anything goes to the AI model, Microsoft Presidio replaces names, ID numbers, addresses, phone numbers and bank details, using Finnish, Swedish and English language models and Finnish patterns. Dates, amounts, reference numbers and authority names are kept, because the explanation needs them. This is on by default in the app.
6. **Analyse.** The cleaned text goes to Claude on Amazon Bedrock in Stockholm, so it stays in the EU. The prompt asks for JSON back (document type, summary, key fields, language) and tells the model to treat the letter as data only, never as instructions.
7. **Save.** The result is stored in PostgreSQL, and an embedding of the document is saved with pgvector so you can search your documents by meaning later.
8. **Follow up.** From there you can draft a reply, move the letter into a folder, or search for it later.

---

## Features

- **Scan and decode.** Take a photo, pick one from the gallery, or import a PDF. Official mail has been mostly digital since April 2026 (OmaKela, Suomi.fi Messages), so many letters arrive as PDFs. Document type, plain-language summary, key fields and language out.
- **Privacy first.** Before the first letter, a consent screen says where letters go and names the AI provider (App Store guideline 5.1.2(i)). Personal data is removed before the AI sees the text: Presidio with Finnish, Swedish and English language models (`opas-infra/presidio`), plus Finnish patterns for the henkilötunnus, street addresses, postcodes, phone numbers and the account holder's own name, including Finnish case endings. Claude runs on Amazon Bedrock in Stockholm, so letter text stays in the EU.
- **Draft replies.** Writes a formal reply or appeal in the same language as the original letter, in the tone you pick, with placeholders like [your name] where details were removed. Free for everyone during the beta (`DRAFTS_FREE_FOR_EVERYONE`).
- **Honest about AI.** Every explanation and draft says the AI can make mistakes, to check dates and amounts against the original, and that it isn't legal advice.
- **Search by meaning.** Searching "tax refund" finds the right letter even if those words aren't in the file name. This uses pgvector with cosine similarity.
- **Folders and archive** to keep things tidy.
- **Free and Premium plans.** Free users get 5 decodes a month. Premium runs through Stripe Checkout and the Stripe billing portal. The mobile apps show no prices or checkout for now (`CAN_PURCHASE` in `opas-mobile/src/lib/billing.ts`): the App Store and Google Play both require their own billing for subscriptions.
- **Deadline reminders.** Scheduled on the phone from the dates in each letter: 7 days before, 1 day before and the morning it's due. Free for everyone. Deadlines can also go into the phone's calendar.
- **Push notifications.** A push when a letter has been read (with an email if the push doesn't arrive), a daily reminder about letters not yet read, and a weekly summary, in the user's language.
- **Email verification.** New accounts get a 6-digit code by email (Amazon SES) and can't log in until they confirm it.
- **Three languages:** English, Finnish and Swedish, in the app and in the verification emails.
- **Accessible.** WCAG AA contrast, 44px touch targets, reduced motion support, and no status that relies on colour alone.

---

## Architecture

```mermaid
flowchart LR
    subgraph Client
        App[Mobile app<br/>Expo / React Native]
    end

    subgraph AWS["AWS (eu-north-1)"]
        ALB[Load balancer] --> API[Spring Boot API<br/>ECS Fargate]
        S3[(S3<br/>document files)]
        Textract[Textract OCR]
        SES[SES email]
        SM[Secrets Manager]
    end

    App -->|REST + JWT| ALB
    App -->|PUT via pre-signed URL| S3

    API --> PG[(PostgreSQL 16<br/>+ pgvector)]
    API --> Redis[(Redis<br/>tokens, quotas, rate limits)]
    API -->|decode job| MQ[[RabbitMQ]]
    MQ --> Worker[Decode worker]
    MQ -.failed jobs.-> DLQ[[Dead-letter queue]]

    Worker --> S3
    Worker --> Textract
    Worker --> Presidio[Presidio<br/>PII removal]
    Worker --> Claude[Claude<br/>Amazon Bedrock, Stockholm]
    Worker --> PG

    Stripe[Stripe] -->|signed webhooks| API
    API --> SES
    SM -.secrets.-> API
```

### The decode flow step by step

```mermaid
sequenceDiagram
    participant App
    participant API as Spring Boot API
    participant S3
    participant MQ as RabbitMQ
    participant W as Decode worker
    participant P as Presidio
    participant AI as Claude
    participant DB as PostgreSQL

    App->>API: POST /documents/upload-url
    API-->>App: pre-signed S3 URL (15 min)
    App->>S3: PUT file
    App->>API: PATCH /documents/{id}/confirm
    App->>API: POST /documents/{id}/decode
    API->>API: check quota (Redis, atomic)
    API->>MQ: publish DecodeMessage
    API-->>App: 202 Accepted
    MQ->>W: deliver job
    W->>DB: already decoded? then skip
    W->>S3: download file
    W->>W: extract text (PDFBox or Textract)
    W->>P: remove personal data
    W->>AI: analyse cleaned text
    AI-->>W: JSON result
    W->>DB: save result and embedding, status = ready
    App->>API: GET /documents/{id}/decode
    API-->>App: decode result
```

---

## Tech stack

| Layer | Technology | What it does here |
|---|---|---|
| Backend | Java 21, Spring Boot 3.5, Spring Security, Spring Data JPA | REST API and background workers |
| AI | Claude (Sonnet 5.5) on Amazon Bedrock in eu-north-1, through the Anthropic Java SDK | Reads letters and drafts replies |
| Embeddings | Spring AI Transformers (local model, 384 dimensions) | Vectors for search, no extra API call |
| Privacy | Microsoft Presidio (analyzer and anonymizer) with Finnish and Swedish spaCy models | Removes personal data before AI calls |
| Database | PostgreSQL 16, pgvector, Flyway | Storage, vector search, versioned migrations |
| Cache and state | Redis | Refresh tokens, logout blacklist, quotas, rate limits, webhook idempotency, job locks |
| Messaging | RabbitMQ with a dead-letter queue | Background decode jobs |
| Files and OCR | Amazon S3, AWS Textract, Apache PDFBox | Storing files and reading text |
| Email | Amazon SES | Verification codes |
| Payments | Stripe (Checkout, billing portal, webhooks) | Premium subscriptions |
| Scheduling | Spring `@Scheduled` with ShedLock | Reminder jobs that run once, even with many instances |
| Mobile | Expo 54, React Native 0.81, TypeScript, Expo Router | iOS and Android app |
| Mobile state | Zustand, TanStack Query | App state and server data caching |
| Styling and i18n | NativeWind (Tailwind), i18next | Theme and en, fi, sv translations |
| Infrastructure | AWS ECS Fargate, ALB, CloudFormation | Staging and production defined as code |
| CI/CD | GitHub Actions, AWS OIDC, Docker, GHCR, Trivy, EAS | Tests, image builds, scans, deploys |
| Monitoring | Spring Actuator, Micrometer, Prometheus, Grafana | Health checks and metrics |
| Testing | JUnit 5, Mockito, Testcontainers | Unit and integration tests |

---

## The project in numbers

| | |
|---|---|
| REST endpoints | 33, across 8 controllers |
| Database migrations | 10 |
| Backend tests | 120, including a full app test with Testcontainers |
| Backend code | about 5,000 lines of Java |
| Mobile app | 75 TypeScript files, 3 languages |
| Local services | 8, all in Docker Compose |

---

## Project structure

```
opas-monorepo/
├── opas-backend/                     # Spring Boot API and decode worker
│   ├── src/main/java/com/opas/
│   │   ├── controller/               # REST endpoints
│   │   │   ├── AuthController        #   sign up, verify email, login, refresh, logout, passwords
│   │   │   ├── DocumentController    #   upload URL, confirm, list, search, archive, delete
│   │   │   ├── DecodeController      #   start a decode, get the result
│   │   │   ├── DraftLetterController #   write and read reply letters
│   │   │   ├── FolderController      #   folders
│   │   │   ├── SubscriptionController#   plans, usage, Stripe checkout, billing portal
│   │   │   ├── PushController        #   save device push tokens
│   │   │   └── WebhookController     #   Stripe webhooks
│   │   ├── service/                  # Business logic
│   │   │   ├── DecodeService         #   the decode pipeline
│   │   │   ├── TextExtractionService #   PDFBox for PDFs, Textract for photos
│   │   │   ├── PresidioService       #   removes personal data
│   │   │   ├── EmbeddingService      #   pgvector embeddings
│   │   │   ├── DraftLetterService    #   reply letters
│   │   │   ├── AuthService           #   accounts, login, tokens
│   │   │   ├── RefreshTokenService   #   refresh tokens in Redis
│   │   │   ├── TokenBlacklistService #   logged-out tokens in Redis
│   │   │   ├── EmailVerificationService # hashed 6-digit codes with an attempt limit
│   │   │   ├── UsageTracker          #   monthly quota (Redis Lua script)
│   │   │   ├── StripeWebhookService  #   subscription changes from Stripe
│   │   │   ├── IdempotencyService    #   handles each Stripe event once
│   │   │   ├── DeadlineReminderService # scheduled push notifications
│   │   │   └── StorageService        #   S3 and pre-signed URLs
│   │   ├── listener/                 # RabbitMQ consumers (decode queue and dead-letter queue)
│   │   ├── config/                   # Security, JWT filter, rate limiting, RabbitMQ, Redis, S3, errors
│   │   ├── domain/                   # JPA entities
│   │   ├── repository/               # Spring Data repositories
│   │   └── dto/                      # Request and response records with validation
│   ├── src/main/resources/
│   │   ├── application.yml           # Config. Every secret comes from an env variable.
│   │   └── db/migration/             # Flyway migrations V1 to V10
│   ├── src/test/                     # 120 tests
│   ├── Dockerfile
│   └── .env.example                  # Template for your local env file
│
├── opas-mobile/                      # Expo / React Native app
│   ├── app/                          # Screens (file-based routing with Expo Router)
│   │   ├── (auth)/                   #   welcome, login, sign up, verify, reset password
│   │   ├── (onboarding)/             #   first-run intro
│   │   ├── (tabs)/                   #   home, scan, docs, search, folders, alerts, profile
│   │   ├── document/[id].tsx         #   one document and its decode result
│   │   ├── draft/[id].tsx            #   draft reply
│   │   └── subscription/             #   plans and upgrade
│   └── src/
│       ├── api/                      # API calls (auth, documents, decode, folders, billing)
│       ├── store/                    # Zustand stores (auth, documents, folders, subscription, theme)
│       ├── components/               # UI kit, icons, animations, tab bar
│       ├── i18n/                     # en.json, fi.json, sv.json
│       └── utils/                    # notifications, calendar
│
├── opas-infra/
│   ├── docker-compose.yml            # PostgreSQL, Redis, RabbitMQ, Presidio, LocalStack, Prometheus, Grafana
│   ├── docker/                       # Setup scripts (pgvector, S3 bucket, Prometheus config)
│   └── cloudformation/               # ECS cluster, load balancer, IAM roles, security groups, task definitions
│
├── docs/screenshots/                 # Screen designs used in this README
├── .github/workflows/                # backend-ci.yml, mobile-ci.yml, infra-ci.yml
└── PRODUCT.md                        # Product brief: who it's for, brand, design principles
```

---

## Running it locally

### What you need

- Java 21 (Temurin works well) and Maven 3.9 or newer
- Docker and Docker Compose
- Node.js 20 and npm
- Expo Go on your phone, or the iOS Simulator or Android Emulator
- AWS credentials with Bedrock access (`bedrock-mantle:CreateInference` in eu-north-1), or an Anthropic API key with `AI_PROVIDER=anthropic`
- Optional: Stripe test keys for payments, and an AWS account for Textract and SES. You don't need AWS to test with PDFs and plain text locally.

### 1. Clone the repo

```bash
git clone https://github.com/GCremez/opas-monorepo.git
cd opas-monorepo
```

### 2. Start the local services

```bash
cd opas-infra
docker compose up -d
docker compose ps        # every service should say "healthy"
```

This gives you:

| Service | Address | Login |
|---|---|---|
| PostgreSQL with pgvector | `localhost:5432` | `opas / opas` |
| Redis | `localhost:6379` | none |
| RabbitMQ | `localhost:5672` (UI at `http://localhost:15672`) | `opas / opas` |
| Presidio Analyzer | `http://localhost:5001` | none |
| Presidio Anonymizer | `http://localhost:5002` | none |
| LocalStack (local S3) | `http://localhost:4566` | `test / test` |
| Prometheus | `http://localhost:9090` | none |
| Grafana | `http://localhost:3001` | `admin / admin` |

### 3. Make your JWT keys

Login tokens are signed with RS256, so you need an RSA key pair:

```bash
openssl genrsa -out private.pem 2048
openssl pkcs8 -topk8 -nocrypt -in private.pem -out private-pkcs8.pem
openssl rsa -in private.pem -pubout -out public.pem
```

Don't commit these. The `.gitignore` already blocks `.pem` files.

### 4. Set up your env file

```bash
cd ../opas-backend
cp .env.example .env.local
```

At minimum, fill in:

```dotenv
DATABASE_PASSWORD=opas
# Claude on Bedrock uses your AWS credentials. Without Bedrock access:
# AI_PROVIDER=anthropic and ANTHROPIC_API_KEY=sk-ant-your-key-here

# Paste each PEM file on one line, with \n for the line breaks
JWT_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----
JWT_PUBLIC_KEY=-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----

# Use LocalStack instead of real S3
AWS_ENDPOINT_URL=http://localhost:4566
AWS_ACCESS_KEY_ID=test
AWS_SECRET_ACCESS_KEY=test
```

Every other option is listed under [Configuration](#configuration).

> **Tip:** with `MAIL_ENABLED=false` (the default), verification codes aren't emailed. They're printed in the backend log, so you can sign up locally without setting up SES.

### 5. Start the backend

```bash
./run-local.sh
# or
./mvnw spring-boot:run -Dspring-boot.run.profiles=local
```

Flyway creates the tables on the first run. The API listens on `http://localhost:8080`.

### 6. Check it's running

```bash
curl http://localhost:8080/actuator/health
```

You should see `"status":"UP"` in the response.

### 7. Start the mobile app

In a second terminal:

```bash
cd opas-mobile
npm install
npx expo start
```

Scan the QR code with Expo Go, or press `i` for the iOS Simulator or `a` for Android. On a real phone, point the app at your computer's local IP:

```bash
EXPO_PUBLIC_API_URL=http://192.168.x.x:8080 npx expo start
```

---

## Using the app

1. Sign up with your email and a password, then enter the 6-digit code. Locally, you'll find the code in the backend log.
2. Go to the Scan tab and take a photo of a letter, or upload a PDF. Files can be up to 20 MB.
3. Open the document and tap Decode. A few seconds later you get:
   - what kind of document it is, for example a Kela decision or a tax notice
   - a short summary in plain language
   - the key details, like dates, amounts and reference numbers
   - the language of the original letter
4. Tap Draft reply if you need to answer it. The reply comes back in the letter's language.
5. Use Search to find any letter by what it's about, and Folders to keep things organised.
6. On the free plan you get 5 decodes a month. You can upgrade from Profile, then Subscription.

---

## API

Everything lives under `/api/v1`. You need an `Authorization: Bearer <accessToken>` header on every call except sign up, verify email, resend code, login, refresh, forgot password, the Stripe webhook and `/actuator/health`.

### Auth

| Method | Endpoint | What it does | Rate limit |
|---|---|---|---|
| `POST` | `/auth/register` | Create an account and send a verification code | 5 per hour |
| `POST` | `/auth/verify-email` | Check the 6-digit code and return tokens | 10 per 5 min |
| `POST` | `/auth/resend-verification` | Send a new code | 5 per hour |
| `POST` | `/auth/login` | Log in and get an access and refresh token | 10 per 5 min |
| `POST` | `/auth/refresh` | Swap a refresh token for new tokens | 30 per 5 min |
| `POST` | `/auth/forgot-password` | Start a password reset | 5 per hour |
| `POST` | `/auth/logout` | Revoke your current tokens | |
| `POST` | `/auth/change-password` | Change your password | 5 per hour |
| `DELETE` | `/auth/account` | Delete your account and all your data | |
| `GET` | `/auth/me` | Get the logged-in user | |

### Documents

| Method | Endpoint | What it does |
|---|---|---|
| `POST` | `/documents/upload-url` | Create a document and get an S3 upload link |
| `PATCH` | `/documents/{id}/confirm` | Mark the upload as finished |
| `GET` | `/documents` | List your documents |
| `GET` | `/documents/search?q=...` | Search your documents by meaning |
| `GET` | `/documents/{id}` | Get one document, with a download link |
| `PATCH` | `/documents/{id}/archive` | Archive a document |
| `PATCH` | `/documents/{id}/folder` | Move it into a folder, or out of one |
| `DELETE` | `/documents/{id}` | Delete the document and its file |

### Decode, replies, folders, billing and push

| Method | Endpoint | What it does |
|---|---|---|
| `POST` | `/documents/{id}/decode` | Queue a decode. Limited to 20 per minute and counts toward your monthly quota. |
| `GET` | `/documents/{id}/decode` | Get the decode result |
| `POST` | `/documents/{id}/draft-letter` | Write a reply or appeal |
| `GET` | `/documents/{id}/draft-letter` | List replies for a document |
| `POST` / `GET` | `/folders` | Create or list folders |
| `GET` / `PUT` / `DELETE` | `/folders/{id}` | Read, update or delete a folder |
| `GET` | `/subscription` | Your current plan |
| `GET` | `/subscription/plans` | Available plans |
| `GET` | `/subscription/usage` | Decodes left this month |
| `POST` | `/subscription/checkout` | Start Stripe Checkout |
| `POST` | `/subscription/portal` | Open the Stripe billing portal |
| `POST` | `/push/register` | Save a device push token |
| `POST` | `/webhooks/stripe` | Stripe events, with signature check |

### Example: upload and decode a letter

**1. Ask for an upload link.** `POST /api/v1/documents/upload-url`

```json
{
  "filename": "kela-decision.pdf",
  "contentType": "application/pdf",
  "fileSize": 248120
}
```

Allowed types are `application/pdf`, `image/jpeg`, `image/png`, `image/heic` and `text/plain`, up to 20 MB.

Response:

```json
{
  "id": "6f1c2a9e-...",
  "filename": "kela-decision.pdf",
  "contentType": "application/pdf",
  "fileSize": 248120,
  "status": "pending",
  "folderId": null,
  "uploadUrl": "https://opas-app-bucket.s3.eu-north-1.amazonaws.com/...",
  "downloadUrl": null,
  "createdAt": "2026-10-16T09:12:44Z",
  "updatedAt": "2026-10-16T09:12:44Z"
}
```

**2. Upload the file.** `PUT` the file to `uploadUrl`, then call `PATCH /api/v1/documents/{id}/confirm`.

**3. Start the decode.** `POST /api/v1/documents/{id}/decode`

```json
{ "scrubPii": true }
```

**4. Get the result.** `GET /api/v1/documents/{id}/decode`

```json
{
  "id": "b2d4...",
  "documentId": "6f1c2a9e-...",
  "structuredData": "{\"documentType\":\"Kela housing allowance decision\",\"summary\":\"Kela approved your housing allowance...\",\"keyFields\":{...},\"language\":\"fi\"}",
  "rawResponse": "...",
  "piiScrubbed": true,
  "model": "claude-sonnet-4-20250514",
  "tokensIn": 1840,
  "tokensOut": 412,
  "durationMs": 6210,
  "createdAt": "2026-10-16T09:13:02Z"
}
```

The values above are examples.

### Example: log in

`POST /api/v1/auth/login`

```json
{ "email": "user@example.com", "password": "a-strong-password" }
```

```json
{
  "accessToken": "eyJhbGciOiJSUzI1NiJ9...",
  "refreshToken": "c1f0...",
  "tokenType": "Bearer",
  "plan": "free",
  "user": { "id": "...", "name": "Aino", "email": "user@example.com", "plan": "free" }
}
```

Access tokens last 15 minutes. Refresh tokens last 30 days.

---

## Data model

| Table | What it stores | Migration |
|---|---|---|
| `users` | Account, BCrypt password hash, verified flag, language | V1, V9, V10 |
| `documents` | File details, S3 key, status, folder, and an embedding (`vector(384)`) | V2, V5 |
| `decode_results` | AI output (raw and JSON), model, token counts, timing, whether PII was removed | V3 |
| `subscriptions` | Plan, status, Stripe IDs, billing period | V4 |
| `folders` | Your folders | V6 |
| `draft_letters` | Generated replies and their tone | V7 |
| `push_tokens` | Device tokens for notifications | V8 |
| `email_verification_codes` | SHA-256 hash of the code, expiry, number of attempts | V9 |

The embedding column has an IVFFlat index with cosine distance, so search stays fast as the number of documents grows.

---

## Tests

```bash
cd opas-backend

# Everything. Docker needs to be running for the full app test.
mvn verify

# Unit tests only, no Docker needed
mvn test -Dtest='!OpasApplicationTests'

# One test class
mvn test -Dtest=AuthServiceTest
```

| Test class | Tests | What it checks |
|---|---|---|
| `AuthServiceTest` | 38 | Sign up, verify, login, refresh, logout, password change and reset, deleting an account, language handling |
| `DecodeServiceTest` | 22 | Quota and ownership checks, Premium users skipping the limit, the pipeline, PII removal on and off, skipping duplicates |
| `DocumentServiceTest` | 18 | Upload links, confirming uploads against the real S3 file, ownership, deleting from S3 and the database |
| `StripeWebhookServiceTest` | 15 | Signature check, checkout, unpaid sessions, subscription updates and cancellations, invoices |
| `UsageTrackerTest` | 11 | Monthly quota, atomic reservation, hitting the limit |
| `PresidioServiceTest` | 13 | Finding and replacing personal data, never asking for dates or organisations, the letter's language, handling failures |
| `JwtUtilTest` | 9 | Signing, parsing, expiry, broken tokens, tokens signed with the wrong key |
| `JwtAuthenticationFilterTest` | 9 | Reading the header, blacklisted and invalid tokens |
| `RefreshTokenServiceTest` | 8 | Storing, using a token only once, revoking everything |
| `AuthControllerTest` | 8 | Request validation and HTTP status codes |
| `DocumentInsightsTest` | 6 | Title, authority, deadlines and the key figure pulled from decode results, malformed data tolerated |
| `EmailServiceTest` | 5 | Verification and "letter ready" emails in the user's language, English fallback, mail switched off |
| `DraftLetterServiceTest` | 5 | Free-for-everyone switch, Premium gating, extracted and redacted text (never raw file bytes), nothing sent if redaction is down |
| `SubscriptionServiceTest` | 4 | Deleting the Stripe customer when an account is deleted, and Stripe outages |
| `ResultReadyNotifierTest` | 4 | Push, then email backup when a letter is ready |
| `GlobalExceptionHandlerTest` | 4 | Error responses for bad input, rate limits, validation and server errors |
| `ClaudeClientTest` | 8 | Text and token usage, server-side fallback on the Anthropic API, Bedrock model IDs and the client-side retry on refusal |
| `ClaudeConfigTest` | 3 | Bedrock client starts without credentials; provider settings |
| `BedrockSigningTest` | 1 | Requests signed (SigV4) for the Stockholm Bedrock endpoint |
| `PresignedUploadUrlTest` | 1 | Upload URLs sign only what the phone sends (no S3 checksum headers) |
| `FinnishPiiPatternsTest` | 3 | 20 sample letters (`src/test/resources/redaction/`): every personal detail removed, reference numbers, dates and amounts kept |
| `DeadlineReminderServiceTest` | 3 | Daily and weekly pushes in the user's language |
| `WebhookControllerTest` | 3 | Stripe webhook signatures: valid, tampered, missing |
| `TokenBlacklistServiceTest` | 3 | The logout blacklist |
| `RateLimitAspectTest` | 3 | Per-endpoint rate limits |
| `FolderServiceTest` | 3 | Built-in folders created once, kept first, and protected from delete and rename |
| `DecodeResponseTest` | 2 | Structured data serialized as a JSON object |
| `OpasApplicationTests` | 1 | The whole app starts against real PostgreSQL and Redis (Testcontainers) |
| `DecodeResultPersistenceTest` | 1 | Saving decode results to real PostgreSQL (Testcontainers) |
| **Total** | **214** | |

For the mobile app:

```bash
cd opas-mobile
npm run typecheck   # TypeScript
npm run lint        # ESLint
npm run test:ci     # Jest: 28 tests (reminders, deadlines, tasks, search, widget, document store)
```

For the Presidio image (Finnish, Swedish and English letters, redacted end to end with the real language models; Infra CI runs it too):

```bash
cd opas-infra && docker compose build presidio-analyzer
docker run --rm -v "$PWD/presidio/test:/test:ro" \
  -v "$PWD/../opas-backend/src/main/resources/presidio:/opas:ro" \
  opas-presidio-analyzer python /test/check_redaction.py /opas /test/letters.txt
```

---

## CI/CD

There are three GitHub Actions workflows. Each one only runs when its own folder changes.

| Workflow | Runs on every push and PR | Runs only when I start it by hand |
|---|---|---|
| Backend CI | `mvn verify`, including the Testcontainers test | Build the Docker image, push to GHCR, scan with Trivy, deploy to ECS staging, then production |
| Mobile CI | TypeScript check, ESLint, Jest | EAS build (preview or production), and an optional App Store and Play Store submit |
| Infra CI | Validates Docker Compose, starts every service and health-checks it, scans images with Trivy | Deploys the CloudFormation stacks, staging first, then production |

GitHub talks to AWS through OIDC. It gets short-lived credentials by assuming an IAM role, so there are no AWS keys stored in GitHub. Production deploys go through a protected GitHub environment.

I keep deploys manual on purpose. A docs change or a merge should never push something to production or submit the app to the stores by accident.

---

## Configuration

All settings come from environment variables (see `opas-backend/.env.example`). On AWS, secrets come from Secrets Manager and are injected into the ECS task.

| Variable | Default | What it's for |
|---|---|---|
| `DATABASE_URL` | `jdbc:postgresql://localhost:5432/opas` | PostgreSQL connection |
| `DATABASE_USER` | `opas` | Database user |
| `DATABASE_PASSWORD` | required | Database password |
| `REDIS_URL` | `redis://localhost:6379` | Redis connection |
| `RABBITMQ_URL` | `amqp://guest:guest@localhost:5672` | RabbitMQ connection |
| `AI_PROVIDER` | `bedrock` | Where Claude runs: `bedrock` (Amazon Bedrock, AWS credentials) or `anthropic` (the Anthropic API) |
| `BEDROCK_REGION` | `eu-north-1` | Bedrock region. Requests are served in this region only |
| `ANTHROPIC_MODEL` | `claude-sonnet-5-5` | Claude model (the `anthropic.` prefix is added on Bedrock) |
| `ANTHROPIC_FALLBACK_MODEL` | `claude-sonnet-5` | On Bedrock, a refused request is retried once on this model |
| `ANTHROPIC_API_KEY` | empty | Only with `AI_PROVIDER=anthropic` |
| `JWT_PRIVATE_KEY` | required | RS256 private key (PKCS#8 PEM) |
| `JWT_PUBLIC_KEY` | required | RS256 public key (PEM) |
| `AWS_REGION` | `eu-north-1` | Region for S3 and Textract |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | empty | Only needed locally. On AWS the task uses its IAM role. |
| `AWS_ENDPOINT_URL` | empty | Set to `http://localhost:4566` for LocalStack |
| `S3_BUCKET_NAME` | `opas-app-bucket` | Bucket for uploaded files |
| `PRESIDIO_SIDECAR_URL` | `http://localhost:5001` | Presidio analyzer |
| `PRESIDIO_LANGUAGE` | `en` | Language used when a letter's language has no model in the Presidio image |
| `PRESIDIO_LANGUAGES` | `en` | Languages the Presidio image has models for. Set `en,fi,sv` with the Opas image (`opas-infra/presidio`, used by docker compose) |
| `DRAFTS_FREE_FOR_EVERYONE` | `true` | Reply drafts for every user (the beta). Set `false` to make them Premium-only |
| `STRIPE_ENABLED` | `false` | Turns payments on |
| `STRIPE_SECRET_KEY` | empty | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | empty | Stripe webhook signing secret |
| `STRIPE_PREMIUM_PRICE_IDS` | empty | Comma-separated price IDs allowed at checkout |
| `STRIPE_RETURN_BASE_URL` | `https://getopas.app` | Where Stripe sends people back to |
| `MAIL_ENABLED` | `false` | Send real emails through SES. Must be `true` in any deployed environment. |
| `MAIL_FROM` | `no-reply@getopas.app` | Verified SES sender |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:3000` | Allowed web origins |
| `LOGGING_LEVEL_COM_OPAS` | `INFO` | Log level for the app |

Fixed limits: access tokens last 15 minutes, refresh tokens 30 days, upload links 15 minutes. Uploads are capped at 20 MB, and the free plan gets 5 decodes a month.

---

## Security

These are government letters, so they often contain ID numbers, addresses and money matters. I treated security as part of the design, not something to add later.

- **Personal data stays out of the AI.** Presidio replaces names, ID numbers, addresses and more before any text goes to Claude.
- **Prompt injection.** The letter is wrapped in `BEGIN_DOCUMENT` and `END_DOCUMENT` markers, and the model is told to treat it as data only. A letter that says "ignore your instructions" gets analysed, not obeyed.
- **Tokens.** Access tokens are RS256 JWTs that last 15 minutes. Refresh tokens live in Redis and are used up in one atomic step, so an old copy can't be replayed.
- **Real logout.** When you log out, your access token goes on a Redis blacklist until it expires.
- **Passwords** are hashed with BCrypt (cost 12).
- **Email verification.** You can't log in until you confirm your email. Codes are stored as SHA-256 hashes and are deleted after 5 wrong tries.
- **No account guessing.** Signing up with an email that already exists gives a generic error, so nobody can check who has an account.
- **Rate limits** on login, sign up, password and decode endpoints, stored in Redis.
- **Ownership checks.** Every document, folder and decode lookup checks that it belongs to you.
- **Upload checks.** File type, size (20 MB max) and file name are validated. When the upload is confirmed, the backend checks the actual file in S3, so the app can't lie about what it uploaded.
- **Stripe.** Webhook signatures are verified, every event is processed once using a Redis key, and checkout only accepts an allow-list of price IDs. Nobody can upgrade themselves with a 0 euro price.
- **No secrets in the code.** Everything comes from env variables or AWS Secrets Manager, and CI uses OIDC instead of stored AWS keys.
- **Image scanning.** Trivy checks Docker images for critical and high vulnerabilities before anything is deployed.

---

## Decisions I made and why

| Decision | Why |
|---|---|
| Decoding runs on RabbitMQ, not inside the request | OCR plus an AI call can take several seconds. A queue keeps the API fast, lets the workers scale on their own, and failed jobs land in a dead-letter queue instead of disappearing. |
| Files go straight to S3 with a pre-signed link | The API never has to hold large files in memory. |
| The decode worker checks for an existing result first | RabbitMQ can deliver the same message twice. Checking first means a repeat never charges the user twice or creates a duplicate. |
| The monthly quota is a Redis Lua script | The check and the increment happen in one step, so tapping Decode twice quickly can't get past the limit. |
| Embeddings run locally inside the app | Search costs nothing extra and no letter text is sent to another API just to build an index. |
| pgvector instead of a separate vector database | Documents and their vectors live in the same database. One less system to run and pay for. |
| ShedLock on scheduled jobs | With several ECS tasks running, each reminder job still runs only once. |
| One repo for backend, app and infra | They change together. One pull request can update the API and the app at the same time. |

---

## What's missing and what's next

The full plan, with priorities, is in [docs/launch-plan.md](docs/launch-plan.md). The main gaps:

- **Paying inside the apps.** Both stores require their own billing for subscriptions, so the apps show no checkout yet. Google Play comes first (launch plan P1-6).
- **The Opas Presidio image in production.** Finnish and Swedish name detection needs the image in `opas-infra/presidio` deployed where production Presidio runs, then `PRESIDIO_LANGUAGES=en,fi,sv`. Finnish stem changes in the account holder's name (Matti → Matin) are left to the language model.
- **More languages.** Explanations in Ukrainian, Russian, Arabic and Tagalog (P1-2).
- **Cases, urgency and sources.** Linking related letters into a case, an urgency label on every letter, and links to official sources (P1-3, P1-4, P1-7).

---

## Author

Built by **Salau Oluwole**, a backend developer working with Java, Spring Boot and AWS.

[GitHub](https://github.com/GCremez) · [LinkedIn](https://www.linkedin.com/in/salauol)
