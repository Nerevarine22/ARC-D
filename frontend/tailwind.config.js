/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Cascadia Code', 'Consolas', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Bloomberg-style dark palette
        bg: {
          primary: '#0a0b0d',
          secondary: '#111318',
          tertiary: '#161a21',
          card: '#0f1117',
          hover: '#1a1f2a',
        },
        border: {
          subtle: '#1e2530',
          default: '#252d3a',
          strong: '#2e3a4a',
        },
        text: {
          primary: '#e8ecf0',
          secondary: '#8b9ab0',
          muted: '#4a5568',
          accent: '#a0aec0',
        },
        // Status indicators
        status: {
          green: '#00d084',
          'green-dim': '#00521f',
          red: '#ff4757',
          'red-dim': '#5c1a1a',
          amber: '#f59e0b',
          'amber-dim': '#451a03',
          blue: '#3b82f6',
          'blue-dim': '#1e3a5f',
        },
        // Category colors
        cat: {
          defi: '#7c3aed',
          'defi-dim': '#2d1b69',
          security: '#dc2626',
          'security-dim': '#4a0f0f',
          parsing: '#0891b2',
          'parsing-dim': '#0c3040',
          infra: '#d97706',
          'infra-dim': '#3d2000',
        },
      },
      animation: {
        'pulse-slow': 'pulse 3s ease-in-out infinite',
        'slide-in': 'slideIn 0.3s ease-out',
        'count-up': 'countUp 0.5s ease-out',
        'blink': 'blink 1.2s step-end infinite',
      },
      keyframes: {
        slideIn: {
          '0%': { opacity: '0', transform: 'translateY(-8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' },
        },
      },
    },
  },
  plugins: [],
}
