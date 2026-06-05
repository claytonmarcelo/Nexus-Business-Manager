/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
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
