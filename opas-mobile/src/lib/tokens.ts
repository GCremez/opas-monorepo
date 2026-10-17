// src/lib/tokens.ts — Opas v2 "Personal Record" design tokens.
// Dual theme (paper / ink). Use `colors` for the light default; use
// `themes.paper` / `themes.ink` when passing hex strings to SVG icons
// (per convention: icons take hex, not class names). NativeWind classes
// (bg-bg, text-fg, border-line, bg-accent, text-warning…) resolve to
// the active theme automatically via the CSS variables in global.css.

export const themes = {
  paper: {
    bg:        '#f2ede2', // background
    surface:   '#eae3d3', // raised panel / inset
    'surface-2':'#e3dbc8',
    fg:        '#211e16', // primary text
    'fg-soft': '#4c473c', // body / secondary
    muted:     '#666054', // metadata, labels — ≥4.5:1 on bg/surface/surface-2 (WCAG AA)
    hairline:  'rgba(33,30,22,0.12)', // row divider
    rule:      'rgba(33,30,22,0.22)', // section header underline
    accent:    '#35503f', // pine — primary / positive
    'on-accent':'#f2ede2',
    warning:   '#835817', // ochre — deadlines — ≥4.5:1 on every paper surface
    danger:    '#9c3a2c', // brick — urgent / destructive
    info:      '#42606f', // slate — neutral emphasis
    node:      '#cdbfa6', // logo start-waypoint / disabled dot
  },
  ink: {
    bg:        '#16150e',
    surface:   '#201e16',
    'surface-2':'#2a2820',
    fg:        '#ece6d8',
    'fg-soft': '#b6ae9e',
    muted:     '#948e81', // ≥4.5:1 on ink surfaces
    hairline:  'rgba(236,230,216,0.13)',
    rule:      'rgba(236,230,216,0.24)',
    accent:    '#8fbb9f',
    'on-accent':'#16150e',
    warning:   '#d8a552',
    danger:    '#d5745f',
    info:      '#7fa0b3',
    node:      '#6f6a5c',
  },
} as const;

export type ThemeName = keyof typeof themes;
export type ThemeColors = (typeof themes)[ThemeName];

// Light is the default theme.
export const colors = themes.paper;

/**
 * CSS-variable map for a theme, e.g. { '--bg': '#f2ede2', ... }. Applied via
 * NativeWind's `vars()` on the root wrapper so the token utilities (bg-bg, text-fg,
 * border-line …) resolve from these. This drives theming inline and switches
 * reliably in BOTH directions — unlike the `.dark:root` selector approach, which did
 * not revert Ink → Paper on native.
 */
export function themeVars(name: ThemeName): Record<string, string> {
  const theme = themes[name];
  const out: Record<string, string> = {};
  for (const key of Object.keys(theme) as (keyof ThemeColors)[]) {
    out[`--${key}`] = theme[key];
  }
  return out;
}

export const space = {
  1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 10: 40, 12: 48, 16: 64, 20: 80,
} as const;

export const radius = {
  sm: 8, md: 12, lg: 18, xl: 24, pill: 999,
} as const;

// RN loads a distinct family per weight (no synthetic weights).
export const font = {
  display: 'Newsreader_500Medium',      // headlines, screen titles
  displaySemibold: 'Newsreader_600SemiBold',
  serif: 'Newsreader_400Regular',       // document prose / summaries
  serifItalic: 'Newsreader_400Regular_Italic',
  body: 'InstrumentSans_400Regular',    // UI / body
  bodyMedium: 'InstrumentSans_500Medium',
  bodySemibold: 'InstrumentSans_600SemiBold', // tracked caps labels
  mono: 'JetBrainsMono_400Regular',     // dates, amounts, refs, metadata
  monoMedium: 'JetBrainsMono_500Medium',
} as const;

export const fontSize = {
  display:  32, // Newsreader 500 — greetings / screen titles
  title:    24, // Newsreader 500 — document titles
  heading:  17, // Instrument 600 — row titles
  body:     15, // Instrument 400
  prose:    16, // Newsreader 400 — the "human voice"
  bodySm:   13,
  label:    10.5, // Instrument 600, uppercase, .18em
  data:     13, // JetBrains Mono 500
  meta:     11, // JetBrains Mono
} as const;

// Tracking presets (letter-spacing) for the tracked-caps label style.
export const tracking = {
  label:  '0.18em',
  eyebrow:'0.20em',
  meta:   '0.05em',
} as const;

export const duration = { fast: 150, normal: 250, slow: 400 } as const;
export const touch = { min: 44 } as const;
