/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        darkBg: '#10172D',
        darkSecondary: '#151F3B',
        darkCard: '#1C2949',
        darkElevated: '#243454',
        darkAccent: '#7895E8',
        darkHighlight: '#C4D0FF',
        darkText: '#F3F5FF',
        darkMuted: '#A7B3D0',
        darkBorder: '#344567',
        navy: {
          DEFAULT: '#10172D',
          dark: '#0C1224',
          light: '#1C2949',
          elevated: '#243454',
          subtle: '#151F3B',
        },
        royal: {
          DEFAULT: '#7895E8',
          hover: '#6885D8',
          light: '#C4D0FF',
          subtle: '#243454',
        },
        app: {
          bg: '#10172D',
          secondary: '#151F3B',
          surface: '#1C2949',
          elevated: '#243454',
          text: '#F3F5FF',
          muted: '#A7B3D0',
          border: '#344567',
          accent: '#7895E8',
          accentSecondary: '#A9B8F2',
          highlight: '#C4D0FF',
        },
        chess: {
          dark: '#10172D',
          panel: '#1C2949',
          panelHover: '#243454',
          boardDark: '#5B7B9C',
          boardLight: '#EDE8DC',
          accent: '#7895E8',
          accentHover: '#6885D8',
          danger: '#DC2626',
          blunder: '#DC2626',
          mistake: '#D97706',
          inaccuracy: '#F59E0B',
          good: '#68758B',
          excellent: '#3B82F6',
          best: '#10B981',
          forced: '#8B5CF6',
          great: '#7895E8',
          brilliant: '#0891B2',
          book: '#7C3AED',
        }
      }
    },
  },
  plugins: [],
}
