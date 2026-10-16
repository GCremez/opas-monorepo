# Opas — AI Document Assistant for Expats in Finland

![Backend CI](https://github.com/GCremez/opas-monorepo/actions/workflows/backend-ci.yml/badge.svg)
![Mobile CI](https://github.com/GCremez/opas-monorepo/actions/workflows/mobile-ci.yml/badge.svg)
![Infra CI](https://github.com/GCremez/opas-monorepo/actions/workflows/infra-ci.yml/badge.svg)

**Opas** ("guide" in Finnish) is a mobile app and backend that helps expats understand letters from Finnish authorities — Kela, the tax office (Vero), the immigration service (Migri) and others. You photograph or upload a letter, and Opas explains it in plain language, pulls out the key details and dates, and can draft a formal reply for you. The app works in **English, Finnish and Swedish**.

## Demo

<!-- Replace with your own demo video (e.g. a YouTube upload):
[![Demo video](https://img.youtube.com/vi/VIDEO_ID/maxresdefault.jpg)](https://youtu.be/VIDEO_ID)
-->

<!-- Add 3–4 app screenshots (save them in docs/screenshots/):
<p align="center">
  <img src="docs/screenshots/home.png" width="220" />
  <img src="docs/screenshots/scan.png" width="220" />
  <img src="docs/screenshots/decode-result.png" width="220" />
  <img src="docs/screenshots/draft-letter.png" width="220" />
</p>
-->

---

## Table of Contents

- [The Problem](#the-problem)
- [How It Works](#how-it-works)
- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Project in Numbers](#project-in-numbers)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Setup Instructions](#setup-instructions)
  - [1. Clone the Repository](#1-clone-the-repository)
  - [2. Start the Local Services](#2-start-the-local-services)
  - [3. Generate JWT Keys](#3-generate-jwt-keys)
  - [4. Configure Environment Variables](#4-configure-environment-variables)
  - [5. Start the Backend](#5-start-the-backend)
  - [6. Check the Backend Is Healthy](#6-check-the-backend-is-healthy)
  - [7. Start the Mobile App](#7-start-the-mobile-app)
- [Usage](#usage)
- [API Endpoints](#api-endpoints)
- [Data Model](#data-model)
- [Running Tests](#running-tests)
- [CI/CD](#cicd)
- [Configuration Reference](#configuration-reference)
- [Security](#security)
- [Design Decisions](#design-decisions)
- [Known Limitations and Next Steps](#known-limitations-and-next-steps)
- [Author](#author)

---

## The Problem

People who move to Finland receive official letters full of bureaucratic language, often in Finnish or Swedish. Missing a deadline or misreading a decision can cost money or delay a residence permit. Translation apps translate words, but they don't tell you **what the letter means or what you need to do next**.

Opas is built for that moment: a stressed user with a letter in their hand who needs a clear answer.

---

## How It Works

1. **Upload** — The app asks the backend for a short-lived upload link, then sends the photo or PDF **straight to Amazon S3**. Large files never pass through the API server.
2. **Confirm** — The app tells the backend the upload finished. The document is saved with status `uploaded`.
3. **Queue the decode** — When the user taps *Decode*, the API checks their monthly quota, puts a job on **RabbitMQ**, and returns immediately. The user doesn't wait on a slow HTTP request.
4. **Extract the text** — A background worker downloads the file from S3 and reads the text: **PDFBox** for PDFs, **AWS Textract** OCR for photos.
5. **Remove personal data** — The text goes through **Microsoft Presidio**, which replaces names, ID numbers, addresses and similar details **before anything is sent to the AI model**. (On by default in the app.)
6. **Analyse** — The cleaned text is sent to **Claude** (via Spring AI) with a prompt that asks for a JSON result: document type, summary, key fields and language. The prompt tells the model to treat the document strictly as data, never as instructions.
7. **Save and index** — The result is saved in PostgreSQL, and an **embedding** of the document is stored with **pgvector** so the user can later search their documents by meaning.
8. **Follow up** — The user can generate a **draft reply or appeal letter** in the document's language, organise documents into folders, and receive push notifications.

---

## Features

- **Scan & decode** — Photo or PDF in; plain-language summary, document type, key fields and language out.
- **Privacy before AI** — Personal data is removed with Presidio before text reaches the AI model.
- **Draft letters** — Generates a formal reply or appeal in the same language as the original letter, with a chosen tone.
- **Semantic search** — Finds documents by meaning (e.g. "tax refund") using pgvector cosine similarity, not just filename matches.
- **Folders** — Organise documents; archive what's done.
- **Free and Premium plans** — Free plan: 5 decodes per month. Premium via **Stripe Checkout** and the Stripe Customer Portal.
- **Push notifications** — Daily reminder about documents uploaded but not yet decoded, and a weekly library summary.
- **Email verification** — 6-digit code sent by Amazon SES; accounts can't log in until verified.
- **Three languages** — English, Finnish and Swedish across the app and verification emails.
- **Accessible design** — WCAG AA contrast, 44px touch targets, reduced-motion support, statuses never shown by colour alone.

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
    Worker --> Claude[Claude<br/>via Spring AI]
    Worker --> PG

    Stripe[Stripe] -->|signed webhooks| API
    API --> SES
    SM -.secrets.-> API
```

### Decode flow, step by step

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
    W->>DB: already decoded? → skip (safe redelivery)
    W->>S3: download file
    W->>W: extract text (PDFBox / Textract)
    W->>P: remove personal data
    W->>AI: analyse cleaned text
    AI-->>W: JSON result
    W->>DB: save result + embedding, status = ready
    App->>API: GET /documents/{id}/decode
    API-->>App: decode result
```

---

## Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Backend** | Java 21, Spring Boot 3.5, Spring Security, Spring Data JPA | REST API and background workers |
| **AI** | Spring AI + Anthropic Claude | Document analysis and letter drafting |
| **Embeddings** | Spring AI Transformers (local, 384 dimensions) | Vectors for semantic search, no external API call |
| **Privacy** | Microsoft Presidio (analyzer + anonymizer) | Removes personal data before AI calls |
| **Database** | PostgreSQL 16 + pgvector, Flyway | Data storage, vector search, versioned migrations |
| **Cache / state** | Redis | Refresh tokens, logout blacklist, quotas, rate limits, webhook idempotency, scheduler locks |
| **Messaging** | RabbitMQ (with dead-letter queue) | Async decode jobs |
| **Files & OCR** | Amazon S3, AWS Textract, Apache PDFBox | Storage and text extraction |
| **Email** | Amazon SES | Verification codes |
| **Payments** | Stripe (Checkout, Customer Portal, webhooks) | Premium subscriptions |
| **Scheduling** | Spring `@Scheduled` + ShedLock | Reminder jobs that run once across many instances |
| **Mobile** | Expo 54, React Native 0.81, TypeScript, Expo Router | iOS and Android app |
| **Mobile state** | Zustand, TanStack Query | Client state and server data caching |
| **Mobile styling / i18n** | NativeWind (Tailwind), i18next | Theming and en / fi / sv translations |
| **Infrastructure** | AWS ECS Fargate, ALB, CloudFormation | Staging and production environments as code |
| **CI/CD** | GitHub Actions, AWS OIDC, Docker, GHCR, Trivy, EAS | Tests, image builds, scanning, deploys |
| **Observability** | Spring Actuator, Micrometer, Prometheus, Grafana | Health checks and metrics |
| **Testing** | JUnit 5, Mockito, Testcontainers | Unit and integration tests |

---

## Project in Numbers

| | |
|---|---|
| REST endpoints | 33, across 8 controllers |
| Database migrations | 10 (Flyway) |
| Backend tests | 120 (JUnit 5 + Mockito, 1 full-app Testcontainers test) |
| Backend code | ~5,000 lines of Java |
| Mobile app | 75 TypeScript files, 3 languages |
| Local services | 8 (Docker Compose) |

---

## Project Structure

```
opas-monorepo/
├── opas-backend/                     # Spring Boot API + decode worker
│   ├── src/main/java/com/opas/
│   │   ├── controller/               # REST endpoints
│   │   │   ├── AuthController        #   register, verify email, login, refresh, logout, passwords
│   │   │   ├── DocumentController    #   upload URL, confirm, list, search, archive, delete
│   │   │   ├── DecodeController      #   start a decode, get the result
│   │   │   ├── DraftLetterController #   generate and read reply/appeal letters
│   │   │   ├── FolderController      #   folder CRUD
│   │   │   ├── SubscriptionController#   plans, usage, Stripe checkout, billing portal
│   │   │   ├── PushController        #   register device push tokens
│   │   │   └── WebhookController     #   Stripe webhooks
│   │   ├── service/                  # Business logic
│   │   │   ├── DecodeService         #   the decode pipeline
│   │   │   ├── TextExtractionService #   PDFBox for PDFs, Textract OCR for images
│   │   │   ├── PresidioService       #   personal-data removal
│   │   │   ├── EmbeddingService      #   pgvector embeddings
│   │   │   ├── DraftLetterService    #   AI letter drafting
│   │   │   ├── AuthService           #   accounts, login, tokens
│   │   │   ├── RefreshTokenService   #   refresh tokens in Redis
│   │   │   ├── TokenBlacklistService #   logged-out access tokens in Redis
│   │   │   ├── EmailVerificationService # hashed 6-digit codes, attempt limits
│   │   │   ├── UsageTracker          #   atomic monthly quota (Redis Lua script)
│   │   │   ├── StripeWebhookService  #   subscription lifecycle from Stripe
│   │   │   ├── IdempotencyService    #   process each Stripe event once
│   │   │   ├── DeadlineReminderService # scheduled push notifications
│   │   │   └── StorageService        #   S3 + pre-signed URLs
│   │   ├── listener/                 # RabbitMQ consumers (decode queue + dead-letter queue)
│   │   ├── config/                   # Security, JWT filter, rate limiting, RabbitMQ, Redis, S3, errors
│   │   ├── domain/                   # JPA entities
│   │   ├── repository/               # Spring Data repositories
│   │   └── dto/                      # Request/response records with validation
│   ├── src/main/resources/
│   │   ├── application.yml           # Configuration (all secrets from env vars)
│   │   └── db/migration/             # Flyway migrations V1–V10
│   ├── src/test/                     # 120 tests
│   ├── Dockerfile
│   └── .env.example                  # Environment variable template
│
├── opas-mobile/                      # Expo / React Native app
│   ├── app/                          # Screens (Expo Router, file-based)
│   │   ├── (auth)/                   #   welcome, login, register, verify, reset password
│   │   ├── (onboarding)/             #   first-run intro
│   │   ├── (tabs)/                   #   home, scan, docs, search, folders, alerts, profile
│   │   ├── document/[id].tsx         #   document detail + decode result
│   │   ├── draft/[id].tsx            #   draft letter
│   │   └── subscription/             #   plans and upgrade
│   └── src/
│       ├── api/                      # API client (auth, documents, decode, folders, billing)
│       ├── store/                    # Zustand stores (auth, documents, folders, subscription, theme)
│       ├── components/               # UI kit, icons, motion components, tab bar
│       ├── i18n/                     # en.json, fi.json, sv.json
│       └── utils/                    # notifications, calendar
│
├── opas-infra/
│   ├── docker-compose.yml            # Local PostgreSQL, Redis, RabbitMQ, Presidio, LocalStack, Prometheus, Grafana
│   ├── docker/                       # Init scripts (pgvector, LocalStack S3 bucket, Prometheus config)
│   └── cloudformation/               # ECS cluster, ALB, IAM roles, security groups, task definitions
│
├── .github/workflows/                # backend-ci.yml, mobile-ci.yml, infra-ci.yml
└── PRODUCT.md                        # Product brief: users, brand, design principles
```

---

## Prerequisites

- **Java 21** (Temurin recommended) and **Maven 3.9+**
- **Docker** and **Docker Compose**
- **Node.js 20** and **npm**
- **Expo Go** on your phone, or an iOS Simulator / Android Emulator
- **Anthropic API key** — for document analysis
- Optional: **Stripe test keys** (payments), **AWS account** (Textract OCR and SES email — not needed for PDFs and plain text locally)

---

## Setup Instructions

### 1. Clone the Repository

```bash
git clone https://github.com/GCremez/opas-monorepo.git
cd opas-monorepo
```

### 2. Start the Local Services

```bash
cd opas-infra
docker compose up -d
docker compose ps        # every service should show "healthy"
```

This starts:

| Service | Address | Login |
|---|---|---|
| PostgreSQL + pgvector | `localhost:5432` | `opas / opas` |
| Redis | `localhost:6379` | — |
| RabbitMQ | `localhost:5672` (UI: `http://localhost:15672`) | `opas / opas` |
| Presidio Analyzer | `http://localhost:5001` | — |
| Presidio Anonymizer | `http://localhost:5002` | — |
| LocalStack (fake S3) | `http://localhost:4566` | `test / test` |
| Prometheus | `http://localhost:9090` | — |
| Grafana | `http://localhost:3001` | `admin / admin` |

### 3. Generate JWT Keys

Opas signs login tokens with RS256, so it needs an RSA key pair:

```bash
openssl genrsa -out private.pem 2048
openssl pkcs8 -topk8 -nocrypt -in private.pem -out private-pkcs8.pem
openssl rsa -in private.pem -pubout -out public.pem
```

Keep these files out of git.

### 4. Configure Environment Variables

```bash
cd ../opas-backend
cp .env.example .env.local
```

Fill in at least these values:

```dotenv
DATABASE_PASSWORD=opas
ANTHROPIC_API_KEY=sk-ant-your-key-here

# Paste each PEM file as one line, with \n for line breaks
JWT_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----
JWT_PUBLIC_KEY=-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----

# Point S3 at LocalStack
AWS_ENDPOINT_URL=http://localhost:4566
AWS_ACCESS_KEY_ID=test
AWS_SECRET_ACCESS_KEY=test
```

See the [Configuration Reference](#configuration-reference) for every option.

> **Tip:** With `MAIL_ENABLED=false` (the default), verification codes are not emailed — they are written to the backend log so you can sign up locally without SES.

### 5. Start the Backend

```bash
./run-local.sh
# or
./mvnw spring-boot:run -Dspring-boot.run.profiles=local
```

Flyway creates all tables on the first start. The API runs on `http://localhost:8080`.

### 6. Check the Backend Is Healthy

```bash
curl http://localhost:8080/actuator/health
```

The response should contain `"status":"UP"`.

### 7. Start the Mobile App

In a new terminal:

```bash
cd opas-mobile
npm install
npx expo start
```

Scan the QR code with Expo Go, or press `i` (iOS Simulator) / `a` (Android Emulator). On a real phone, point the app at your computer's local IP:

```bash
EXPO_PUBLIC_API_URL=http://192.168.x.x:8080 npx expo start
```

---

## Usage

1. **Sign up** with email and password, then enter the 6-digit code (from your email, or from the backend log locally).
2. **Scan or upload** a letter from the **Scan** tab — camera photo or PDF, up to 20 MB.
3. Open the document and tap **Decode**. Within a few seconds you see:
   - the **document type** (e.g. Kela decision, tax notice)
   - a **plain-language summary**
   - **key fields** — dates, amounts, reference numbers
   - the **language** of the original
4. Tap **Draft reply** to generate a formal response or appeal in the letter's language.
5. Use **Search** to find any document by meaning, and **Folders** to organise them.
6. Free users get **5 decodes per month**. Upgrade from **Profile → Subscription**.

---

## API Endpoints

Base path: `/api/v1`. All endpoints need a `Authorization: Bearer <accessToken>` header **except** register, verify-email, resend-verification, login, refresh, forgot-password, the Stripe webhook and `/actuator/health`.

### Auth

| Method | Endpoint | Description | Rate limit |
|---|---|---|---|
| `POST` | `/auth/register` | Create an account (sends a verification code) | 5 / hour |
| `POST` | `/auth/verify-email` | Confirm the 6-digit code, returns tokens | 10 / 5 min |
| `POST` | `/auth/resend-verification` | Send a new code | 5 / hour |
| `POST` | `/auth/login` | Log in, returns access + refresh token | 10 / 5 min |
| `POST` | `/auth/refresh` | Swap a refresh token for new tokens | 30 / 5 min |
| `POST` | `/auth/forgot-password` | Start password reset | 5 / hour |
| `POST` | `/auth/logout` | Revoke the current tokens | — |
| `POST` | `/auth/change-password` | Change password | 5 / hour |
| `DELETE` | `/auth/account` | Delete account and all data | — |
| `GET` | `/auth/me` | Current user | — |

### Documents

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/documents/upload-url` | Create a document and get a pre-signed S3 upload URL |
| `PATCH` | `/documents/{id}/confirm` | Mark the upload as finished |
| `GET` | `/documents` | List your documents |
| `GET` | `/documents/search?q=...` | Semantic search across your documents |
| `GET` | `/documents/{id}` | Get one document (with a download URL) |
| `PATCH` | `/documents/{id}/archive` | Archive a document |
| `PATCH` | `/documents/{id}/folder` | Move to a folder (or out of one) |
| `DELETE` | `/documents/{id}` | Delete a document and its file |

### Decode, Draft Letters, Folders, Billing, Push

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/documents/{id}/decode` | Queue a decode (20 / min, counts toward quota) |
| `GET` | `/documents/{id}/decode` | Get the decode result |
| `POST` | `/documents/{id}/draft-letter` | Generate a reply/appeal letter |
| `GET` | `/documents/{id}/draft-letter` | List drafts for a document |
| `POST` / `GET` | `/folders` | Create / list folders |
| `GET` / `PUT` / `DELETE` | `/folders/{id}` | Read / update / delete a folder |
| `GET` | `/subscription` | Current plan |
| `GET` | `/subscription/plans` | Available plans |
| `GET` | `/subscription/usage` | Decodes left this month |
| `POST` | `/subscription/checkout` | Start Stripe Checkout |
| `POST` | `/subscription/portal` | Open the Stripe billing portal |
| `POST` | `/push/register` | Save a device push token |
| `POST` | `/webhooks/stripe` | Stripe events (signature-verified) |

### Example: upload and decode a document

**1. Get an upload URL** — `POST /api/v1/documents/upload-url`

```json
{
  "filename": "kela-decision.pdf",
  "contentType": "application/pdf",
  "fileSize": 248120
}
```

Allowed types: `application/pdf`, `image/jpeg`, `image/png`, `image/heic`, `text/plain`. Max size: 20 MB.

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

**2. Upload the file** — `PUT` the file bytes to `uploadUrl`, then call `PATCH /api/v1/documents/{id}/confirm`.

**3. Start the decode** — `POST /api/v1/documents/{id}/decode`

```json
{ "scrubPii": true }
```

**4. Get the result** — `GET /api/v1/documents/{id}/decode`

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

*(Values above are illustrative.)*

### Example: log in — `POST /api/v1/auth/login`

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

Access tokens live **15 minutes**; refresh tokens live **30 days**.

---

## Data Model

| Table | What it stores | Migration |
|---|---|---|
| `users` | Account, BCrypt password hash, verified flag, language | V1, V9, V10 |
| `documents` | File metadata, S3 key, status, folder, **embedding `vector(384)`** | V2, V5 |
| `decode_results` | AI output (raw + JSON), model, token counts, timings, PII-scrubbed flag | V3 |
| `subscriptions` | Plan (free/premium), status, Stripe IDs, billing period | V4 |
| `folders` | User folders | V6 |
| `draft_letters` | Generated letters and tone | V7 |
| `push_tokens` | Device tokens for notifications | V8 |
| `email_verification_codes` | SHA-256 hash of the code, expiry, attempt count | V9 |

The embedding column has an **IVFFlat index** with cosine distance for fast similarity search.

---

## Running Tests

```bash
cd opas-backend

# All tests — Docker must be running (the full-app test uses Testcontainers)
mvn verify

# Unit tests only — no Docker needed
mvn test -Dtest='!OpasApplicationTests'

# One test class
mvn test -Dtest=AuthServiceTest
```

| Test class | Tests | What it covers |
|---|---|---|
| `AuthServiceTest` | 29 | Register, verify, login, refresh, logout, password change, account deletion, language handling |
| `DocumentServiceTest` | 12 | Upload URLs, confirm (checks the real S3 file's type and size), ownership checks, delete from S3 + DB |
| `UsageTrackerTest` | 11 | Monthly quota, atomic reservation, limit reached |
| `StripeWebhookServiceTest` | 9 | Signature check, checkout, unpaid sessions, subscription update/cancel, invoices |
| `JwtUtilTest` | 9 | Token signing, parsing, expiry, malformed tokens, wrong signing key |
| `DecodeServiceTest` | 9 | Quota and ownership checks, Premium bypass, pipeline, PII scrubbing on/off, redelivery skip |
| `RefreshTokenServiceTest` | 8 | Store, consume once, revoke all |
| `AuthControllerTest` | 8 | Request validation and HTTP responses |
| `PresidioServiceTest` | 7 | Detecting and replacing personal data, failure handling |
| `JwtAuthenticationFilterTest` | 7 | Header parsing, blacklisted and invalid tokens |
| `GlobalExceptionHandlerTest` | 4 | Error responses (bad input, rate limit, validation, server error) |
| `TokenBlacklistServiceTest` | 3 | Logout blacklist |
| `RateLimitAspectTest` | 3 | Per-endpoint rate limits |
| `OpasApplicationTests` | 1 | Whole app starts against real PostgreSQL + Redis (Testcontainers) |
| **Total** | **120** | |

Mobile checks:

```bash
cd opas-mobile
npm run typecheck   # TypeScript
npm run lint        # ESLint
npm run test:ci     # Jest
```

---

## CI/CD

Three GitHub Actions workflows, each triggered only when its folder changes:

| Workflow | Runs automatically (push / PR) | Runs only when started by hand |
|---|---|---|
| **Backend CI** | `mvn verify` (all tests, incl. Testcontainers) | Build Docker image → push to GHCR → Trivy scan → deploy to ECS staging → deploy to production |
| **Mobile CI** | TypeScript check, ESLint, Jest | EAS build (preview or production), optional App Store / Play Store submit |
| **Infra CI** | Validate Docker Compose, start every service and health-check it, Trivy scan of images | Deploy CloudFormation stacks (staging → production) |

AWS access uses **OIDC federation** — GitHub gets short-lived credentials by assuming an IAM role, so **no AWS keys are stored in GitHub**. Production deploys use a protected GitHub **environment**.

---

## Configuration Reference

All values come from environment variables (see `opas-backend/.env.example`). In AWS, secrets are injected from **Secrets Manager** into the ECS task.

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | `jdbc:postgresql://localhost:5432/opas` | PostgreSQL JDBC URL |
| `DATABASE_USER` | `opas` | Database user |
| `DATABASE_PASSWORD` | _(required)_ | Database password |
| `REDIS_URL` | `redis://localhost:6379` | Redis connection |
| `RABBITMQ_URL` | `amqp://guest:guest@localhost:5672` | RabbitMQ connection |
| `ANTHROPIC_API_KEY` | _(required)_ | Claude API key |
| `JWT_PRIVATE_KEY` | _(required)_ | RS256 private key (PKCS#8 PEM) |
| `JWT_PUBLIC_KEY` | _(required)_ | RS256 public key (PEM) |
| `AWS_REGION` | `eu-north-1` | AWS region for S3 / Textract |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | _(empty)_ | Only for local use; deployed tasks use their IAM role |
| `AWS_ENDPOINT_URL` | _(empty)_ | Set to `http://localhost:4566` for LocalStack |
| `S3_BUCKET_NAME` | `opas-app-bucket` | Bucket for uploaded files |
| `PRESIDIO_SIDECAR_URL` | `http://localhost:5001` | Presidio analyzer URL |
| `PRESIDIO_LANGUAGE` | `en` | Language the PII analyzer runs in |
| `STRIPE_ENABLED` | `false` | Turn payments on |
| `STRIPE_SECRET_KEY` | _(empty)_ | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | _(empty)_ | Stripe webhook signing secret |
| `STRIPE_PREMIUM_PRICE_IDS` | _(empty)_ | Comma-separated price IDs allowed at checkout |
| `STRIPE_RETURN_BASE_URL` | `https://opas.app` | Where Stripe sends the user back |
| `MAIL_ENABLED` | `false` | Send real emails via SES (must be `true` when deployed) |
| `MAIL_FROM` | `no-reply@opas.fi` | Verified SES sender |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:3000` | Allowed web origins |
| `LOGGING_LEVEL_COM_OPAS` | `INFO` | App log level |

Built-in limits: access token **15 min**, refresh token **30 days**, upload URL **15 min**, upload size **20 MB**, free plan **5 decodes / month**.

---

## Security

Government letters are sensitive, so security was designed in from the start:

- **Personal data removed before AI** — Presidio replaces names, ID numbers, addresses and more before any text is sent to Claude.
- **Prompt-injection guard** — The document is wrapped in `BEGIN_DOCUMENT` / `END_DOCUMENT` markers and the model is told to treat it only as data.
- **RS256 JWTs** — Short-lived access tokens (15 min). Refresh tokens are stored in Redis and **consumed atomically**, so a stolen token can't be reused after the real user refreshes.
- **Real logout** — Logged-out access tokens go on a Redis blacklist until they expire.
- **Passwords** — BCrypt with cost 12.
- **Email verification gate** — Accounts can't log in until verified. Codes are stored as SHA-256 hashes and deleted after 5 wrong attempts.
- **No account enumeration** — Registration with an existing email returns a generic error.
- **Rate limiting** — Per-endpoint limits in Redis on login, registration, password and decode endpoints.
- **Ownership checks** — Every document, folder and decode lookup checks the logged-in user owns it.
- **Upload validation** — Allowed file types, a 20 MB cap and safe filenames are enforced on the request. On confirm, the backend checks the **real file in S3** matches the declared type and size, so a client can't lie about what it uploaded.
- **Stripe safety** — Webhook signatures are verified, each event is processed once (Redis idempotency keys), and checkout only accepts an allow-list of price IDs, so a user can't upgrade with a $0 price.
- **No secrets in code** — All secrets come from environment variables / AWS Secrets Manager. CI uses OIDC, not stored AWS keys.
- **Image scanning** — Trivy scans Docker images for critical and high vulnerabilities before deploy.

---

## Design Decisions

| Decision | Why |
|---|---|
| **RabbitMQ for decoding** instead of doing it in the request | OCR + AI can take many seconds. Queuing keeps the API fast, lets workers scale on their own, and failed jobs go to a dead-letter queue instead of being lost. |
| **Pre-signed S3 uploads** | Files go straight from the phone to S3, so the API never holds large files in memory. |
| **Idempotent decode worker** | RabbitMQ can deliver a message twice. The worker checks for an existing result first, so a redelivery never charges the user twice or creates duplicates. |
| **Quota check with a Redis Lua script** | Check-and-increment happen in one atomic step, so two quick taps can't both slip past the limit. |
| **Local embedding model** | Embeddings run inside the app (384-dim), so search adds no cost and sends no document text to another API. |
| **pgvector instead of a separate vector database** | Documents and their vectors live in the same PostgreSQL database — one less system to run. |
| **ShedLock for scheduled jobs** | With several ECS tasks running, each reminder job still runs only once. |
| **Monorepo** | Backend, mobile and infra change together; one PR can update the API and the app at the same time. |

---

## Known Limitations and Next Steps

- **Mobile app tests** — Typecheck and lint run in CI, but there are no Jest tests yet.
- **PII detection for Finnish** — Presidio runs in English by default (`PRESIDIO_LANGUAGE=en`). A Finnish model is needed to reliably catch Finnish identifiers such as the *henkilötunnus*.
- **Deadline-based reminders** — Reminders currently cover undecoded documents and a weekly summary. Using the dates extracted by the AI to remind users before real deadlines is the next step.
- **Streaming results** — The app currently polls for the decode result; pushing it via WebSocket or a push notification would feel faster.

---

## Author

Built by **Salau Oluwole** — backend developer (Java, Spring Boot, AWS).

[GitHub](https://github.com/GCremez) · [LinkedIn](https://www.linkedin.com/in/salauol)
