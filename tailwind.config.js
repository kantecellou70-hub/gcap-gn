/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Palette GCAP-GN (identité visuelle guinéenne)
        primary: {
          50:  '#EBF5FB',
          100: '#D6EAF8',
          500: '#2E86C1',
          700: '#1B4F72',
          900: '#0D2535',
        },
        accent: {
          300: '#F9E4B7',
          500: '#F39C12',
          700: '#D68910',
        },
        success: {
          100: '#D5F5E3',
          500: '#1E8449',
        },
        danger: {
          100: '#FADBD8',
          500: '#922B21',
        },
        // Statuts des engagements
        status: {
          brouillon:  '#94A3B8',
          attente:    '#F39C12',
          vise:       '#1E8449',
          rejete:     '#922B21',
          liquide:    '#2E86C1',
          ordonnance: '#1B4F72',
          annule:     '#4A4A4A',
        },
      },
      fontFamily: {
        sans: ['IBM Plex Sans', 'system-ui', 'sans-serif'],
        mono: ['IBM Plex Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}
