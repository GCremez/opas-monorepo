/** tailwind.config.js — Opas v2 "Personal Record" (NativeWind v4).
 *  Colours resolve to CSS variables set in global.css (:root = paper,
 *  .dark = ink), so a single class works in both themes. Font families
 *  match the @expo-google-fonts weights loaded in App root (see FONTS.md). */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg:          'var(--bg)',
        surface:     'var(--surface)',
        'surface-2': 'var(--surface-2)',
        fg:          'var(--fg)',
        'fg-soft':   'var(--fg-soft)',
        muted:       'var(--muted)',
        // `border-hairline` is NativeWind's built-in width utility (all four
        // sides), so border colour uses `line` instead.
        hairline:    'var(--hairline)',
        line:        'var(--hairline)',
        rule:        'var(--rule)',
        accent:      'var(--accent)',
        'on-accent': 'var(--on-accent)',
        warning:     'var(--warning)',
        danger:      'var(--danger)',
        info:        'var(--info)',
        node:        'var(--node)',
      },
      fontFamily: {
        display:  ['Newsreader_500Medium'],
        'display-semibold': ['Newsreader_600SemiBold'],
        serif:    ['Newsreader_400Regular'],
        'serif-italic': ['Newsreader_400Regular_Italic'],
        body:     ['InstrumentSans_400Regular'],
        medium:   ['InstrumentSans_500Medium'],
        semibold: ['InstrumentSans_600SemiBold'],
        mono:     ['JetBrainsMono_400Regular'],
        'mono-medium': ['JetBrainsMono_500Medium'],
      },
      fontSize: {
        display:  ['32px', { lineHeight: '34px', letterSpacing: '-0.01em' }],
        title:    ['24px', { lineHeight: '27px', letterSpacing: '-0.01em' }],
        heading:  ['17px', { lineHeight: '22px' }],
        prose:    ['16px', { lineHeight: '26px' }],
        body:     ['15px', { lineHeight: '22px' }],
        'body-sm':['13px', { lineHeight: '19px' }],
        // Floor for UI text is 11.5px (tracked caps) / 12px — smaller is unreadable for many
        // users and ignores the accessibility text-size settings people rely on.
        label:    ['11.5px', { lineHeight: '15px', letterSpacing: '0.14em' }],
        data:     ['13px', { lineHeight: '18px' }],
        meta:     ['12px', { lineHeight: '16px', letterSpacing: '0.04em' }],
      },
      borderRadius: {
        sm: '8px', md: '12px', lg: '18px', xl: '24px', pill: '999px',
      },
      spacing: {
        1: '4px', 2: '8px', 3: '12px', 4: '16px', 5: '20px', 6: '24px',
        8: '32px', 10: '40px', 12: '48px', 16: '64px', 20: '80px',
      },
      minHeight: { touch: '44px' },
      minWidth: { touch: '44px' },
    },
  },
  plugins: [],
};
