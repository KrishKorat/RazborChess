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
        // Soft, Elegant, Cohesive Lavender & Purple Palette
        surface: {
          canvas: '#171525',    // Main dark lavender background
          base: '#201D35',      // Secondary background / headers / panels
          card: '#292440',      // Card background
          overlay: '#332D4D',   // Elevated surfaces & active overlays
          hover: '#3C355A',     // Interactive hover surface
        },
        accent: {
          DEFAULT: '#B7A5E8',   // Primary lavender
          hover: '#C4B5FD',     // Subtle accent / hover
          soft: '#D4C7F2',      // Soft lavender
          pale: '#C4B5FD',      // Subtle accent
          muted: '#9586C5',     // Muted lavender
          subtle: 'rgba(183, 165, 232, 0.15)',
          red: '#d3503c',       // Muted danger/loss/check accent
          gold: '#f0a800',      // Soft golden accent
        },
        border: {
          subtle: 'rgba(183, 165, 232, 0.12)',
          DEFAULT: '#443B60',   // Borders
          strong: 'rgba(183, 165, 232, 0.35)',
        },
        content: {
          primary: '#F3EFFB',   // Main text
          secondary: '#B8AFD1', // Secondary text
          muted: '#8C81A8',     // Subdued text
          accent: '#B7A5E8',    // Primary lavender highlight
        },
        // Backward-compatible tokens for existing component styles
        darkBg: '#171525',
        darkSecondary: '#201D35',
        darkCard: '#292440',
        darkElevated: '#332D4D',
        darkAccent: '#B7A5E8',
        darkHighlight: '#C4B5FD',
        darkText: '#F3EFFB',
        darkMuted: '#B8AFD1',
        darkBorder: '#443B60',
        navy: {
          DEFAULT: '#171525',
          dark: '#12101D',
          light: '#292440',
          elevated: '#332D4D',
          subtle: '#201D35',
        },
        royal: {
          DEFAULT: '#B7A5E8',
          hover: '#C4B5FD',
          light: '#D4C7F2',
          subtle: '#332D4D',
        },
        app: {
          bg: '#171525',
          secondary: '#201D35',
          surface: '#292440',
          elevated: '#332D4D',
          text: '#F3EFFB',
          muted: '#B8AFD1',
          border: '#443B60',
          accent: '#B7A5E8',
          accentSecondary: '#D4C7F2',
          highlight: '#C4B5FD',
        },
        chess: {
          dark: '#171525',
          panel: '#292440',
          panelHover: '#332D4D',
          boardDark: '#8B79B5',
          boardLight: '#E8E1F2',
          accent: '#B7A5E8',
          accentHover: '#C4B5FD',
          danger: '#d3503c',
          blunder: '#dc2626',
          mistake: '#ea580c',
          inaccuracy: '#e5b338',
          good: '#64748b',
          excellent: '#629924',
          best: '#81b64c',
          forced: '#457b9d',
          great: '#3b82f6',
          brilliant: '#1baca6',
          book: '#967858',
        }
      }
    },
  },
  plugins: [],
}
