export const colors = {
  bg: '#000000',
  surface: '#1c1c1e',
  'surface-2': '#2c2c2e',
  'surface-3': '#3a3a3c',
  fg: '#f5f5f7',
  muted: '#86868b',
  border: '#38383a',
  accent: '#92d9bb',
  'accent-hover': '#7eccac',
  'accent-dim': 'rgba(146, 217, 187, 0.13)',
  danger: '#ff453a',
  warning: '#ff9f0a',
  success: '#30d158',
  info: '#5e5ce6',
} as const;

export const space = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
  20: 80,
} as const;

export const radius = {
  sm: 6,
  md: 10,
  lg: 16,
  xl: 20,
} as const;

export const font = {
  display: 'Lufga',
  body: 'system-ui',
  mono: 'JetBrains Mono',
} as const;

export const fontSize = {
  display: 32,
  headingXl: 24,
  headingL: 20,
  headingM: 17,
  body: 15,
  bodySm: 13,
  caption: 12,
  mono: 13,
} as const;

export const duration = {
  fast: 150,
  normal: 250,
  slow: 400,
} as const;

export const touch = {
  min: 44,
} as const;
