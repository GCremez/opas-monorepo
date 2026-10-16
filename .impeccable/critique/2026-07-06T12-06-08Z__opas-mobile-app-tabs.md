---
target: opas-mobile/app/(tabs)
total_score: 23
p0_count: 2
p1_count: 2
timestamp: 2026-07-06T12-06-08Z
slug: opas-mobile-app-tabs
---
# Opas Mobile App — UX Critique

**Method**: Dual-agent (A: design-review · B: detector)
**Target**: `opas-mobile/app/(tabs)/` + design system HTML
**Date**: July 2026

---

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2/4 | Indefinite spinner during scan processing; no time estimate |
| 2 | Match System / Real World | 4/4 | Natural language, familiar agency names, plain instructions |
| 3 | User Control and Freedom | 2/4 | `router.replace` destroys back stack; no scan cancellation |
| 4 | Consistency and Standards | 3/4 | Deadline info uses 3 visual treatments; Profile is aesthetic outlier |
| 5 | Error Prevention | 1/4 | No confirmation before destructive actions; no permission fallback |
| 6 | Recognition Rather Than Recall | 3/4 | No document thumbnails; filter labels require taxonomy knowledge |
| 7 | Flexibility and Efficiency | 2/4 | No swipe gestures, batch ops, or long-press menus |
| 8 | Aesthetic and Minimalist Design | 4/4 | Clean layouts, restrained accent, proper whitespace |
| 9 | Error Recovery | 1/4 | ErrorState component exists but is never imported/used |
| 10 | Help and Documentation | 1/4 | No onboarding, no contextual help, no tooltips |
| **Total** | | **23/40** | **Acceptable — significant improvements needed** |

---

## Anti-Patterns Verdict

**LLM assessment**: The app largely avoids AI clichés. No gradient text, no glassmorphism as default, no hero-metric template, no numbered section markers in the product UI. The floating bottom tab bar's glass style is appropriate and Apple-inspired rather than gratuitous. The weakest point is the Profile screen with uppercase tracked section headers ("APP LANGUAGE", "SETTINGS", "ACCOUNT") — an AI slop tell — and the 2×2 quick actions card grid on Home which blends together.

**Deterministic scan** (on design system HTML): Found 10 issues —
- Inter font flagged as overused (×2)
- Bounce/elastic easing curves (×3)
- Em-dash overuse in body copy (×2)
- Numbered section markers in design system docs (×1)
- Dark mode with colored glow on scan button (×1)

**Synthesis**: The detector caught the spring easing used in the design system's switch component and the green glow on the scan button — both are valid warnings worth addressing. The numbered section markers are in the design system documentation only, not the product UI, so that's a false positive for the product critique.

---

## Overall Impression

Opas has a strong visual foundation — the dark mint-accented palette, restrained typography, and clean layouts are genuinely well-crafted. The design system is thorough and thoughtful. The distance between spec and implementation is where the problems live: excellent component designs that aren't wired up (ErrorState, swipe gestures, progress bars), and uneven screen quality (Home and Scan are polished; Profile is an outlier).

---

## What's Working

1. **Color discipline**: The mint-teal accent (`#92d9bb`) is used 1–2 times per screen, never decorative. On pure black with charcoal surfaces, this creates a calm, premium, trustworthy feel that perfectly matches the brand.

2. **Scan state machine**: The `ready → scanning → processing → success → error` flow is cleanly implemented with distinct visual treatments. The corner-bracketed viewfinder is a crafted detail.

3. **Typography pairing**: Lufga + Inter creates effective hierarchy. Negative tracking on headlines gives the intended spacious feel. Body at 15px/1.7 is highly readable.

---

## Priority Issues

### P0: No undo, no error recovery
`ErrorState` component exists but is **never used** in any screen. No confirmation for destructive actions. No undo. This is the most damaging gap — Matti (anxious expat) will fear mistakes; Sofia (power user) will suffer the consequences of speed; Casey (distracted) will accidentally trigger destructive actions.
- **Why**: Users handling government documents need to feel safe. One accidental archive and trust is lost.
- **Fix**: Wire ErrorState into all data-fetching screens, add confirmation sheets for destructive actions.
- **Suggested**: `/impeccable harden`

### P0: Indefinite processing with no progress feedback
Scan processing uses an unbounded spinner. Design system explicitly says "2000ms+: progress bar with estimated time." Users have no idea if this takes 2s or 2min at their most anxious moment.
- **Why**: Violates Doherty Threshold. Peak emotional valley with no information.
- **Fix**: Add progress bar after 2s, show estimated time, add cancel button.
- **Suggested**: `/impeccable polish scan`

### P1: Tab navigation destroys back stack
`router.replace` breaks the fundamental mobile navigation contract. Pressing back after tabs will exit the app.
- **Why**: iOS/Android users expect back gesture to return to previous screen.
- **Fix**: Use `router.push` or implement tab stack management.
- **Suggested**: `/impeccable polish`

### P1: Profile screen is aesthetic outlier
Uppercase tracked section headers (AI slop pattern). Divider lines instead of card grouping. Inconsistent with rest of the app.
- **Why**: Configuration is where users spend time. Feels fragmented.
- **Fix**: Re-platform onto card-based grouping. Remove uppercase tracking from headers.
- **Suggested**: `/impeccable polish profile`

### P2: Deadline information is scattered across 3 screens
Home shows one deadline card. Folders shows 2 deadline cards. Documents shows deadline badges. No centralized view.
- **Why**: Users must cross-reference screens to know what's due.
- **Fix**: Consolidate into one timeline view, or persistent deadline banner.
- **Suggested**: `/impeccable layout`

### P2: Search is a thin layer
Text-only search with no previews, filters, highlighting, or alternatives on "no results." Power users will be frustrated daily.
- **Why**: Search is the primary navigation for power users with 20+ documents.
- **Fix**: Add authority/date/type filters, result previews with highlights.
- **Suggested**: `/impeccable shape search` or `/impeccable craft search`

---

## Persona Red Flags

### Matti (New Expat — first month, no Finnish, stressed)
- 🚩 No onboarding → drops into empty home with no guidance
- 🚩 "Decoding" is unexplained jargon
- 🚩 Language selection buried in Profile → should be first-launch
- 🚩 No privacy/security reassurance on document scans

### Sofia (Busy Professional — 2+ years, power user)
- 🚩 No batch operations → must tap each document individually
- 🚩 No swipe gestures → every action requires tap → navigate → confirm
- 🚩 Search too basic → no filters, preview, or sort
- 🚩 Back stack destroyed → rapid navigation between tabs breaks

### Casey (Distracted Mobile User — on the go, interrupted)
- 🚩 No scan cancellation → once started, committed to wait
- 🚩 Invisible progress → might close app thinking it froze
- 🚩 No undo → accidental tap has no recovery
- ✅ Large touch targets | ✅ Prominent scan button

---

## Minor Observations

- `folders.tsx` uses inline `style={{ letterSpacing: -0.03 * 24 }}` — should be a tailwind utility
- BottomTabBar's ScanIcon always shows INACTIVE color regardless of active state
- Inconsistent component choice: `TouchableOpacity` in Search, `Pressable` everywhere else
- BottomSheet uses RN `Modal` with `animationType="slide"` — design system specifies spring with drag-to-dismiss
- Profile toggles are custom‑built — design system has `.switch` with proper spring animation
- No haptic feedback anywhere (design system specifies light impact on press)
- No `backdrop-filter` on the RN bottom tab bar (design system has `blur(30px)`)
- Detector flagged spring easing in design system — switch to `ease-out-quart` per impeccable guidelines
- Detector flagged Inter as overused — consider a more distinctive body font for production

---

## Questions to Consider

- "What if the scan success screen offered a calming, guided next step instead of just raw extracted data?"
- "Does the deadline urgency need its own persistent space, or should it be a notification instead?"
- "What would a confident, power‑user version of the documents list look like with batch actions and swipe gestures?"
