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
        /* ── Brand palette ─────────────────────────── */
        bg: {
          primary:   '#F7F7F5',
          secondary: '#FFFFFF',
          panel:     '#FFFFFF',
          hover:     '#F0F0EE',
          tertiary:  '#EBEBEA',
        },
        border: {
          subtle:  '#E4E4E4',
          default: '#CECECE',
          strong:  '#B0B0B0',
        },
        text: {
          primary:   '#111111',
          secondary: '#444444',
          muted:     '#888888',
          accent:    '#222222',
        },
        status: {
          green:        '#1A6B3C',
          'green-dim':  '#E6F2EC',
          red:          '#D62B2B',
          'red-dim':    '#FBE9E9',
          amber:        '#C47A00',
          'amber-dim':  '#FDF3E0',
          blue:         '#1A4FD6',
          'blue-dim':   '#E8EEFB',
          lime:         '#1A6B3C',
          'lime-dim':   '#E6F2EC',
        },
        cat: {
          defi:          '#5B21B6',
          'defi-dim':    '#EDE9F7',
          security:      '#D62B2B',
          'security-dim':'#FBE9E9',
          parsing:       '#1A4FD6',
          'parsing-dim': '#E8EEFB',
          infra:         '#C47A00',
          'infra-dim':   '#FDF3E0',
        },
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
        DEFAULT: '2px',
        sm: '2px',
        md: '4px',
        lg: '6px',
      },
    },
  },
  plugins: [],
}
