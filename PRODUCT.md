# Product

## Register

product

## Users

Expats in Finland — recent immigrants navigating Finnish bureaucracy (Kela, Tax, Residence permits, social benefits). They arrive with intermediate English (or Finnish/Swedish as a second language) and zero knowledge of Finnish administrative systems. The context is often stressful: deadlines, unfamiliar terminology, and official correspondence they can't fully read.

## Product Purpose

Opas ("Guide" in Finnish) is an AI-powered document assistant that helps expats understand, organize, and act on government documents. It scans physical or digital documents, extracts key information, translates bureaucratic language into plain instructions, surfaces deadlines and required actions, and keeps everything organized so nothing falls through the cracks. Success means a user who previously felt lost and anxious about Finnish paperwork now feels calmly in control.

## Brand Personality

Calm. Trustworthy. Honest.

- **Voice**: Plain, direct English + Finnish/Swedish. Short sentences. Lead with the action or deadline. Never use bureaucratic language to explain bureaucratic language.
- **Tone**: Reassuring, never condescending. Solid, predictable, never flashy.
- **Emotional goal**: A user arrives stressed → we hand them clarity and confidence.

## Anti-references

Opas explicitly avoids:
- **SaaS corporate**: Generic blue/navy enterprise dashboards, cookie-cutter B2B styling
- **Fintech dark & flashy**: Neon gradients, glassmorphism, crypto-style UIs
- **Government website**: Dense tables, small text, bureaucratic visual styling
- **AI tool clichés**: Gradient text ("background-clip: text"), wireframe aesthetics, purple/magenta accents, the hero-metric template, side-stripe borders, numbered section markers (01/02/03), tiny uppercase tracked eyebrows above every section

## Design Principles

1. **Clarity over cleverness** — Every screen must be usable by someone with intermediate English and zero knowledge of Finnish administration. No jargon, no assumptions.

2. **Action-first hierarchy** — The most important thing is what to do next. Always the most prominent element. The primary action should be visually unique.

3. **One thumb, one tap** — Every core action reachable with the thumb on a 6.1" screen. The scan button is permanently in the bottom nav. Touch targets min 44×44px.

4. **Calm & trustworthy** — Users arrive stressed. The interface must feel solid, predictable, reassuring — never flashy. Motion is purposeful and subdued.

5. **Respect the data** — Government correspondence is sensitive. Design communicates security through restraint: clear visual boundaries around personal content, transparent loading states, no unnecessary data exposure.

## Accessibility & Inclusion

- WCAG AA minimum (4.5:1 contrast, ≥44px touch targets)
- i18n-first: Finnish, Swedish, English — text length variation built into layouts
- Reduced-motion support on every animation
- Non-color signals: every status uses icon or label, never color alone
- Dynamic type support via device font size settings

---

# Implementation Context

## Monorepo Structure

```
opas-mobile/     — Expo/React Native app (iOS + Android)
opas-backend/    — Spring Boot 3 API server
opas-infra/      — Docker Compose infrastructure
```

## Tech Stack

### Mobile (opas-mobile)
- **Framework**: Expo SDK ~52 with Expo Router (file-based routes)
- **Language**: TypeScript (strict)
- **Styling**: NativeWind v4 (Tailwind CSS for React Native)
- **State**: Zustand stores (authStore, documentStore, folderStore, subscriptionStore)
- **i18n**: react-i18next with en/fi/sv JSON files
- **Fonts**: Lufga (display/headings), system-ui (body), JetBrains Mono (mono)
- **HTTP**: axios with interceptors for JWT auth
- **Camera**: expo-camera CameraView for real capture + expo-image-picker for gallery
- **Navigation**: expo-router with Stack + Tab navigator, custom floating-pill BottomTabBar
- **Icons**: Custom SVG icon components in `src/components/icons/index.tsx`

### Backend (opas-backend)
- **Framework**: Spring Boot 3 + JPA/Hibernate
- **Database**: PostgreSQL 15 with pgvector
- **Auth**: JWT (access + refresh tokens), SHA-256 refresh token storage
- **Object Storage**: AWS S3 (LocalStack for dev)
- **Message Queue**: RabbitMQ (async decode pipeline)
- **Decode Pipeline**: Presidio (PII analyzer/anonymizer) -> OpenAI
- **Subscription**: Stripe webhook-driven, plans: free / premium
- **Cache**: Redis

### Infrastructure (opas-infra)
- 8 containers: PostgreSQL, Redis, RabbitMQ, LocalStack (S3), Presidio analyzer, Presidio anonymizer, Prometheus, Grafana
- All run via `docker compose up -d`

## Design System

### Colors (dark theme only)
```
bg:        #000000
surface:   #1c1c1e
surface-2: #2c2c2e
surface-3: #3a3a3c
fg:        #f5f5f7 (body text)
muted:     #86868b (secondary text)
border:    #38383a
accent:    #92d9bb (mint green, primary interactive color)
danger:    #ff453a
warning:   #ff9f0a
success:   #30d158
info:      #5e5ce6
```

### Spacing Scale (in px)
4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80

Use Tailwind utility classes throughout. No inline `StyleSheet.create()`. Avoid random hardcoded gap/margin/padding values.

### Font Sizes
```
display:   32px/700  (headings only)
heading-l: 20px/600
heading-m: 17px/600
body:      15px      (primary content)
body-sm:   13px      (secondary/metadata)
caption:   12px/500  (labels, badges)
```

### Key Components
- `Button` — variants: primary (accent bg), ghost (no bg), danger (red bg)
- `Badge` — compact rounded label, variants: accent/success/warning/danger/info/neutral
- `Pill` — larger bordered label, variants match Badge
- `BottomSheet` — slide-up action sheet with action list
- `ConfirmSheet` — slide-up confirmation dialog with two buttons
- `ToastProvider` + `useToast` — modal-based centered pill toast (no icon, no action)
- `ErrorState` / `EmptyState` — full-width inline states with retry/action
- `BottomTabBar` — floating pill design, scan tab as prominent circle

## Screen Map

| Route | Screen | Purpose |
|---|---|---|
| `/(tabs)/index` | Home | Greeting, smart quick actions (3 tiers by user stage), premium upgrade banner, demo deadline banner |
| `/(tabs)/search` | Search | Search bar + authority filter chips + browse cards + recent documents + result list |
| `/(tabs)/scan` | Scan | Camera viewfinder (real expo-camera), flash toggle, gallery pick, processing/error/success states |
| `/(tabs)/docs` | Documents | Built-in + user folders, expandable folder contents, deadline cards, document list with status |
| `/(tabs)/profile` | Profile | Avatar/name/plan, settings toggles, language picker (BottomSheet), account links, sign out |
| `/document/[id]` | Document Detail | 4 pill tabs (Summary/Original/Dates/Actions), key-value metadata, action checklist, bottom toolbar (Share/Export/Archive/Delete gated) |
| `/subscription/index` | Subscription | Pricing tiers (monthly/yearly), feature list, Stripe checkout |
| `/(onboarding)/index` | Onboarding | 3-slide carousel (scan/AI/organize), pagination dots, Skip/Next/Get Started |
| `/(auth)/login` | Login | Email + password, sign in link |
| `/(auth)/register` | Register | Name + email + password, create account link |

### User Stages (home screen quick actions)
- `new` (0 docs) → Scan First, Browse Folders, How Opas Works
- `onboarding` (docs uploaded, none decoded to `ready`) → Scan First, Browse Documents, Upcoming Deadlines
- `active` (≥1 decoded doc) → Continue Scanning, Upcoming Deadlines, Browse Documents

### Key Auth Flows
- `isDemo` flag in authStore gates mock data vs real API data
- Demo users start seeded with sample docs, folders, deadlines
- Real users see only API-backed content (no mock data)
- `has_seen_onboarding` persisted in SecureStore
- `plan` field tracked in authStore, synced from `/auth/me` response
- `isPremium` derived via `usePremium()` hook (also checks `isDemo`)

## Current Status

### Done
- Full auth flow (register, login, JWT refresh, logout, demo login)
- Onboarding carousel with seen-check gating
- Home screen with 3-tier smart quick actions
- Scan screen with real camera, gallery pick, API upload
- Document detail with 4-tab layout, action checklist, bottom toolbar
- Search with authority filters, browse cards, recent docs, result list
- Folders CRUD (built-in + custom) on both backend and mobile
- Subscription pages (Stripe checkout/portal) fully wired
- Premium gating: Export/Archive locked for free users, upgrade banner on home
- Profile with settings, language switching, logout
- Toast system (modal-based centered pill)
- Floating pill tab bar with prominent scan circle
- All i18n keys exist in en/fi/sv
- Custom SVG icon set in shared index

### Done
- Archive API endpoint (+mobile wiring) — PATCH /{id}/archive, list excludes archived
- Decode limit enforcement (UsageTracker + Redis + config, free tier: 5/mo)
- Draft letters: backend (POST /{id}/draft-letter, premium-gated) + mobile screen with tone selection, share/copy
- Calendar sync: `addToCalendar()` utility via expo-calendar, wired to document "Add to calendar" action
- Push notifications: backend (POST /push/register, PushToken entity) + mobile registration on auth

### Pending
- App store submission prep (icon, name, metadata, screenshots) — UX polish needed before this

## Critical Conventions

1. **No static StyleSheet.create()** — all styling via NativeWind className props
2. **No console.log in production** — use showToast for user-facing messages
3. **All user-facing text must use i18n** — never hardcoded strings
4. **Screens are default exports** — file-based routing via expo-router
5. **API client is shared** — `src/lib/api.ts` with axios + interceptors
6. **Demo data is inline** — no separate mock files, gated by `isDemo` check
7. **SafeAreaView for top edge** — `edges={['top']}` for tab screens, `edges={['top', 'bottom']}` for scan/overlay
8. **Colors pass as string props to icons** — use hex values matching token definitions (not class names for SVG colors)
9. **Alert.alert uses `t()` for all strings** — never hardcoded dialog text
10. **RefreshControl tintColor** uses `#92d9bb` hex (native prop, not a CSS class)
