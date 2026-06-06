/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        nexus: {
          // Fundo e Superficies
          bg: '#05070A',
          'bg-soft': '#0B0D10',
          'bg-panel': '#0B0D10',
          card: 'rgba(11, 13, 16, 0.86)',
          'card-strong': 'rgba(11, 13, 16, 0.94)',
          'card-soft': 'rgba(17, 20, 25, 0.74)',
          sidebar: '#07090D',
          // Dourado e Bronze
          gold: '#D49556',
          bronze: '#9a6a42',
          // Rose
          rose: '#c96f78',
          'rose-light': '#e89aa2',
          'rose-dark': '#9d4e58',
          // Textos
          text: '#f5f1ec',
          muted: '#b8afa7',
          'muted-2': '#8f8580',
          // Status
          success: '#9BE37A',
          danger: '#FF6B6B',
          warning: '#D49556',
          // Bordas
          border: 'rgba(212, 149, 86, 0.24)',
          'border-strong': 'rgba(212, 149, 86, 0.38)',
        },
        brand: {
          // Dashboard Image Colors (mantidos para compatibilidade)
          charcoal: '#1A1C21',
          cardDark: '#21242B',
          cardSoft: '#2A2E37',
          green: '#3E958F',
          greenHover: '#85D5D2',
          textPrimary: '#F7F2EC',
          textSecondary: 'rgba(247, 242, 236, 0.72)',
          teal: '#4DD0E1',
          purple: '#9C27B0',
          lightBg: '#F7F2EC',
          lightCard: '#FFFFFF',
          lightText: '#050505',
          lightTextSecondary: '#242424',
          borderDark: 'rgba(62, 149, 143, 0.24)',
          borderLight: 'rgba(62, 149, 143, 0.24)',
          // Compatibility aliases
          blackCherry: '#050505',
          primary: '#3E958F',
          primaryHover: '#85D5D2',
          ivorySmoke: '#F7F2EC',
          graphiteWine: '#242424',
          graphite: '#050505',
          graphiteLight: '#151515',
          pearl: '#F7F2EC',
          gold: '#D6B370',
          error: '#A94442',
        },
      },
    },
  },
  plugins: [],
};
