/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        lk: {
          yellow: '#FDD017',
          gold: '#e0b810',
          dark: '#0f0f11',
          card: '#18181b',
          border: '#27272a',
          muted: '#a1a1aa'
        }
      },
      fontFamily: {
        sans: ['Outfit', 'Inter', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
