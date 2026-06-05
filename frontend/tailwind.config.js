/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        nexus: {
          // Nova cor principal de destaque - teal corporativa
          teal: '#3E958F',
          // Cor secundária para hover, gráficos e brilho
          tealLight: '#85D5D2',
          // Dourado da logo como destaque premium
          gold: '#D6B370',
          // Preto e cinza do projeto
          black: '#050505',
          deepBlack: '#0A0A0A',
          darkGray: '#151515',
          graphite: '#242424',
          softGray: '#2E2E2E',
          // Textos
          text: '#F7F2EC',
          textSecondary: 'rgba(247, 242, 236, 0.72)',
          // Tema claro
          lightBg: '#F7F2EC',
          lightBgSecondary: '#EFE6DC',
          lightText: '#050505',
          lightTextSecondary: '#242424',
          // Border colors
          border: 'rgba(62, 149, 143, 0.24)',
          borderLight: 'rgba(62, 149, 143, 0.24)',
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
