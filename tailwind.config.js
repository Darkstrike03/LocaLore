/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx,js,jsx}'],
  theme: {
    extend: {
      colors: {
        background: '#020617', // slate-950-like
        surface: '#020617',
        accent: {
          DEFAULT: '#F59E0B',
        },
      },
      fontFamily: {
        gothic: ['"Cinzel"', 'serif'],
      },
      boxShadow: {
        'amber-glow': '0 0 25px rgba(245, 158, 11, 0.35)',
      },
    },
  },
  plugins: [],
}
