/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        gray: {
          50:  'var(--color-gray-50, #f9fafb)',
          100: 'var(--color-gray-100, #f3f4f6)',
          200: 'var(--color-gray-200, #e5e7eb)',
          300: 'var(--color-gray-300, #d1d5db)',
          400: 'var(--color-gray-400, #9ca3af)',
          500: 'var(--color-gray-500, #6b7280)',
          600: 'var(--color-gray-600, #4b5563)',
          700: 'var(--color-gray-700, #374151)',
          800: 'var(--color-gray-800, #1f2937)',
          900: 'var(--color-gray-900, #111827)',
        },
        nexus: {
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
          950: '#1e1b4b',
        },
        brand: {
          blackCherry: '#1A0D12',
          roseGold: '#B76E79',
          champagneGold: '#D6B370',
          ivorySmoke: '#F7F2EC',
          graphiteWine: '#32252B',
        },
      },
    },
  },
  plugins: [],
};
