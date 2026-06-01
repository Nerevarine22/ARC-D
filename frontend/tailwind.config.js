/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        mono:    ['IBM Plex Mono', 'JetBrains Mono', 'Fira Code', 'monospace'],
        sans:    ['Inter Tight', 'Inter', 'system-ui', 'sans-serif'],
        display: ['Inter Tight', 'Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        /* ── Bento palette ─────────────────────────── */
        bg: {
          primary:   '#000000',
          secondary: '#111111',
          panel:     '#1A1A1A',
          hover:     '#222222',
        },
        border: {
          subtle:  '#333333',
          default: '#444444',
          strong:  '#555555',
        },
        text: {
          primary:   '#FFFFFF',
          secondary: '#EBEBEB',
          muted:     '#A3A3A3',
          accent:    '#000000',
        },
        bento: {
          green:  '#D6E3CC',
          yellow: '#BDB31E',
          purple: '#9E94BA',
          orange: '#FF5C39',
        }
      },
      animation: {
        'pulse-slow': 'pulse 3s ease-in-out infinite',
        'slide-in':   'slideIn 0.3s ease-out',
        'count-up':   'countUp 0.5s ease-out',
        'blink':      'blink 1.2s step-end infinite',
        'fade-in':    'fade-in 0.4s ease-out',
        'row-in':     'row-in 0.25s ease-out',
      },
      keyframes: {
        slideIn: {
          '0%':   { opacity: '0', transform: 'translateY(-8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%':      { opacity: '0' },
        },
      },
      borderRadius: {
        DEFAULT: '8px',
        sm: '4px',
        md: '12px',
        lg: '16px',
        xl: '24px',
        '2xl': '32px',
      },
    },
  },
  plugins: [],
}
