/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#09090b',
        panel: '#111113',
        line: '#27272a',
        accent: '#a3e635',
      },
    },
  },
  plugins: [],
}
