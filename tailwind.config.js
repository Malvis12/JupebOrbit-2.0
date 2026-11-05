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
        brand: {
          50: '#f0f4ff',
          100: '#e0e9fe',
          200: '#c1d3fe',
          300: '#92b3fd',
          400: '#5c89fa',
          500: '#345df6',
          600: '#2546eb',
          700: '#1d35d8',
          800: '#1e2eaf',
          900: '#1e2c8a',
          950: '#0f174a',
        },
        accent: {
          500: '#8b5cf6',
          600: '#7c3aed',
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['Bricolage Grotesque', 'sans-serif'],
      },
      boxShadow: {
        'premium': '0 20px 50px -12px rgba(0, 0, 0, 0.08)',
        'premium-dark': '0 20px 50px -12px rgba(0, 0, 0, 0.45)',
        'glow': '0 0 25px rgba(37, 70, 235, 0.25)',
      }
    }
  },
  plugins: [],
}

