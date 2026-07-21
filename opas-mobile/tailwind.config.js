/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        bg: '#000000',
        surface: '#1c1c1e',
        'surface-2': '#2c2c2e',
        'surface-3': '#3a3a3c',
        fg: '#f5f5f7',
        muted: '#86868b',
        border: '#38383a',
        accent: {
          DEFAULT: '#92d9bb',
          hover: '#7eccac',
          dim: 'rgba(146, 217, 187, 0.13)',
        },
        danger: '#ff453a',
        warning: '#ff9f0a',
        success: '#30d158',
        info: '#5e5ce6',
      },

      borderRadius: {
        sm: '6px',
        md: '10px',
        lg: '16px',
        xl: '20px',
      },
      fontFamily: {
        display: ['Lufga', 'Inter', 'system-ui', 'sans-serif'],
        body: ['system-ui', 'Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        'display': ['32px', { lineHeight: '1.05', fontWeight: '700' }],
        'heading-xl': ['24px', { lineHeight: '1.1', fontWeight: '600' }],
        'heading-l': ['20px', { lineHeight: '1.25', fontWeight: '600' }],
        'heading-m': ['17px', { lineHeight: '1.3', fontWeight: '600' }],
        'body': ['15px', { lineHeight: '1.7' }],
        'body-sm': ['13px', { lineHeight: '1.6' }],
        'caption': ['12px', { lineHeight: '1.5', fontWeight: '500' }],
        'mono': ['13px', { lineHeight: '1.7' }],
      },
      transitionDuration: {
        'fast': '150ms',
        'normal': '250ms',
        'slow': '400ms',
      },
      minHeight: {
        'touch': '44px',
      },
      minWidth: {
        'touch': '44px',
      },
    },
  },
  plugins: [],
};
