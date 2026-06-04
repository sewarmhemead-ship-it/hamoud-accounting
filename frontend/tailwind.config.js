/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // لوحة الثيم الذهبي الداكن (hamoud-clearance-ui)
        surface: {
          DEFAULT: '#0a0c10', // الخلفية العامة
          card: '#111318', // البطاقات / الشريط الجانبي
          hover: '#181c24', // تمرير / سطح ثانوي
          raised: '#1e2330', // سطح بارز
          border: '#ffffff14', // حدود خفيفة
        },
        accent: {
          DEFAULT: '#c9a84c', // ذهبي
          hover: '#e8c96a', // ذهبي فاتح
          muted: '#c9a84c22', // ذهبي شفاف
        },
        gold: {
          DEFAULT: '#c9a84c',
          light: '#e8c96a',
          deep: '#8b6914',
        },
        success: '#22c55e',
        warning: '#f59e0b',
        danger: '#ef4444',
        info: '#3b82f6',
        ink: {
          DEFAULT: '#e8eaf0', // نص أساسي
          soft: '#8891a8', // نص ثانوي
          faint: '#4a5268', // نص خافت
        },
      },
      fontFamily: {
        sans: [
          'IBM Plex Sans Arabic',
          'Segoe UI',
          'Tahoma',
          'Arial',
          'sans-serif',
        ],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      borderRadius: {
        xl: '14px',
      },
      boxShadow: {
        gold: '0 2px 12px #c9a84c30',
        'gold-lg': '0 4px 20px #c9a84c40',
      },
    },
  },
  plugins: [],
}
