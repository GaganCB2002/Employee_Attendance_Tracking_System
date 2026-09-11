/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        telemetry: {
          darkest: '#09090b',
          dark: '#18181b',
          card: '#27272a',
          border: '#3f3f46',
          accent: '#0ea5e9',
          alert: '#ef4444',
          warning: '#f59e0b',
          success: '#10b981',
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Menlo', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
