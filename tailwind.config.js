/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#003366', // Azul Escuro
        secondary: '#0055AA',
        background: '#E0F2F7', // Azul Claro
      }
    },
  },
  plugins: [],
}