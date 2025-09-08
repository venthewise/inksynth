/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        'sans': ['Manrope', 'sans-serif'],
        'serif': ['DM Serif Display', 'serif'],
      },
      colors: {
         accent: {
          '500': '#3b82f6',
          '600': '#2563eb',
        }
      }
    },
  },
  plugins: [],
}
