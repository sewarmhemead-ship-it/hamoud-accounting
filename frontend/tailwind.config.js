/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: '#090b12',
          card:    'rgba(255,255,255,0.04)',
          hover:   'rgba(255,255,255,0.065)',
          raised:  'rgba(255,255,255,0.08)',
          border:  'rgba(255,255,255,0.08)',
        },
        accent: {
          DEFAULT: '#60A5FA',
          hover:   '#93c5fd',
          muted:   'rgba(96,165,250,0.12)',
          deep:    '#3b82f6',
        },
        success: '#22c55e',
        warning: '#f59e0b',
        danger:  '#ef4444',
        info:    '#38bdf8',
        ink: {
          DEFAULT: '#f8fafc',
          soft:    '#cbd5e1',
          faint:   '#94a3b8',
        },
      },
      fontFamily: {
        sans: ['Cairo', 'IBM Plex Sans Arabic', 'Segoe UI', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      borderRadius: {
        xl:   '12px',
        '2xl':'16px',
        '3xl':'22px',
      },
      boxShadow: {
        accent:     '0 2px 16px rgba(96,165,250,0.18)',
        'accent-lg':'0 4px 28px rgba(96,165,250,0.26)',
        gold:       '0 2px 16px rgba(96,165,250,0.18)',
        glass:     '0 8px 40px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.07)',
        'glass-sm':'0 4px 24px rgba(0,0,0,0.35)',
        'glass-lg':'0 16px 56px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)',
        float:     '0 24px 64px rgba(0,0,0,0.5)',
      },
      keyframes: {
        'fade-in': {
          '0%':   { opacity: 0, transform: 'translateY(8px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
        'slide-down': {
          '0%':   { opacity: 0, transform: 'translateY(-4px) scale(0.98)' },
          '100%': { opacity: 1, transform: 'translateY(0) scale(1)' },
        },
      },
      animation: {
        'fade-in':   'fade-in 0.22s ease-out',
        'slide-down':'slide-down 0.18s ease-out',
      },
    },
  },
  plugins: [],
}
