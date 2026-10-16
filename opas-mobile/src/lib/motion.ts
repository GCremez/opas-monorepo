// src/lib/motion.ts — Opas v2 "Personal Record" motion tokens.
// Telekinetic loading & gestures: an unseen hand arranging paper. Every loader
// carries the mark's DNA — a dashed path, three waypoints, an arrival. Elements
// drift, gather along the ring, and settle with a small overshoot.
//
// Built for react-native-reanimated v3+. Pair with `useReducedMotion()`
// (re-exported below) — when true, skip the loop/overshoot and cross-fade only.
//
// Visual source of truth: "Opas Motion — Loaders.dc.html".

import { Easing, withTiming, withRepeat, withSequence } from 'react-native-reanimated';
export { useReducedMotion } from 'react-native-reanimated';

// ── Durations (ms) ──────────────────────────────────────────────
// Extends tokens.ts `duration` ({fast:150, normal:250, slow:400}) with the
// per-state loop lengths used by the eight motion states.
export const motionDuration = {
  fast:     150, // micro state changes, chip select
  normal:   250, // enter/exit, cross-fade
  slow:     400, // sheet slide, settle
  orbit:    2600, // one waypoint lap (The Orbit)
  redact:   2400, // one line sweep (The Redaction)
  decode:   45,   // per-glyph churn tick (The Decode)
  passage:  1900, // waypoint traverse + check (The Passage)
  splash:   1300, // cold-start to interactive (The Arrival)
  materialize: 500, // per-card blur-in (Home materialise)
  stagger:  120,  // gap between staggered siblings
} as const;

// ── Easing ──────────────────────────────────────────────────────
// `settle` is the signature curve — a gentle overshoot on arrival.
export const easing = {
  settle:   Easing.bezier(0.22, 1, 0.36, 1),   // the Opas arrival curve
  standard: Easing.bezier(0.4, 0, 0.2, 1),     // enter/exit, cross-fade
  track:    Easing.bezier(0.5, 0, 0.5, 1),     // constant travel along the ring
  linear:   Easing.linear,                     // continuous spin
} as const;

// ── Spring (gesture release, gather) ────────────────────────────
export const spring = {
  gather:   { damping: 18, stiffness: 220, mass: 1 },  // pull-to-refresh release
  overshoot:{ damping: 12, stiffness: 260, mass: 1 },  // waypoint seating
} as const;

// ── Ring geometry (shared with the brand mark, 140×140 viewBox) ─
// Waypoint seats + fly-in offsets for The Arrival splash.
export const ring = {
  viewBox: 140,
  trackRadius: 43,
  waypoints: [
    { cx: 70, cy: 26,  token: 'accent',  from: { x: 0,   y: -40 } }, // pine, top
    { cx: 108, cy: 92, token: 'warning', from: { x: 38,  y: 24 } },  // ochre, bottom-right
    { cx: 32, cy: 92,  token: 'danger',  from: { x: -38, y: 24 } },  // brick, bottom-left
  ],
  dash: '3 9',            // dashed-track stroke-dasharray
  pulseScale: 1.28,       // core pulse peak (The Orbit)
  seatOvershoot: 1.14,    // waypoint overshoot peak (The Arrival)
} as const;

// ── Reduced-motion policy ───────────────────────────────────────
// When reduced motion is on: no loops, no travel, no overshoot. Replace any
// looping loader with a static mark + a quiet opacity pulse, and replace
// enter/settle with a plain 150ms cross-fade. Never fully suppress feedback —
// a spinner-less state still needs a "working" signal.
export const reducedFallback = {
  crossFade: motionDuration.fast,
  pulseOpacity: [0.5, 1] as const,
  pulseDuration: 900,
} as const;

// ── Helpers ─────────────────────────────────────────────────────

// Continuous spin for The Orbit ring (degrees, looped, linear).
export const spinLoop = () =>
  withRepeat(withTiming(360, { duration: motionDuration.orbit * 3.4, easing: easing.linear }), -1, false);

// Settle a shared value to `to` with the signature overshoot curve.
export const settleTo = (to: number, duration = motionDuration.slow) =>
  withTiming(to, { duration, easing: easing.settle });

// Two-keyframe opacity pulse — the reduced-motion "working" signal, and the
// core pulse fallback.
export const pulse = () =>
  withRepeat(
    withSequence(
      withTiming(reducedFallback.pulseOpacity[0], { duration: reducedFallback.pulseDuration / 2, easing: easing.standard }),
      withTiming(reducedFallback.pulseOpacity[1], { duration: reducedFallback.pulseDuration / 2, easing: easing.standard }),
    ), -1, true);

export type MotionState =
  | 'orbit' | 'redaction' | 'decode' | 'assembly'
  | 'passage' | 'gather' | 'splash' | 'materialize';
