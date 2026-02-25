/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx,js,jsx}'],
  theme: {
    extend: {
      colors: {
        app: {
          background: '#050507',
          surface: '#0C0C12',
          surfaceElevated: '#13131E',
          border: '#1E1E2E',
          borderHot: '#3A1A1A',
          primary: '#C8A84B',
          secondary: '#5C2D91',
          danger: '#8B1111',
          blood: '#6B0000',
          rune: '#4A7C8E',
        },
        parchment: {
          DEFAULT: '#D4CDB8',
          muted: '#5A5570',
          dim: '#3A3550',
        },
        void: '#020204',
        crimson: {
          DEFAULT: '#8B1111',
          dark: '#5A0A0A',
          glow: 'rgba(139, 17, 17, 0.4)',
        },
        gold: {
          DEFAULT: '#C8A84B',
          dim: '#7A6430',
          glow: 'rgba(200, 168, 75, 0.25)',
        },
      },
      fontFamily: {
        heading: ['"Cinzel"', 'serif'],
        body: ['"IM Fell English"', 'Georgia', 'serif'],
        ui: ['"Inter"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'gold-glow': '0 0 24px rgba(200, 168, 75, 0.18), 0 0 6px rgba(200, 168, 75, 0.08)',
        'gold-glow-lg': '0 0 40px rgba(200, 168, 75, 0.25), 0 0 10px rgba(200, 168, 75, 0.12)',
        'crimson-glow': '0 0 24px rgba(139, 17, 17, 0.35), 0 0 6px rgba(139, 17, 17, 0.15)',
        'void-deep': '0 8px 40px rgba(0,0,0,0.9), inset 0 1px 0 rgba(255,255,255,0.03)',
        'inner-rune': 'inset 0 0 20px rgba(200, 168, 75, 0.06)',
      },
      backgroundImage: {
        'rune-gradient': 'linear-gradient(135deg, #0C0C12 0%, #050507 50%, #0a0710 100%)',
        'card-surface': 'linear-gradient(160deg, #0C0C12 0%, #050507 100%)',
        'hero-vignette': 'radial-gradient(ellipse at center, transparent 30%, #050507 90%)',
        'scanlines': "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.08) 2px, rgba(0,0,0,0.08) 4px)",
      },
      dropShadow: {
        'gold': '0 0 8px rgba(200, 168, 75, 0.6)',
        'blood': '0 0 8px rgba(139, 17, 17, 0.6)',
      },
      transitionDuration: {
        300: '300ms',
        500: '500ms',
      },
      keyframes: {
        'pin-pulse': {
          '0%, 100%': { transform: 'scale(1)', opacity: '0.9' },
          '50%': { transform: 'scale(1.2)', opacity: '0.5' },
        },
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'glow-pulse': {
          '0%, 100%': { boxShadow: '0 0 8px rgba(200,168,75,0.2)' },
          '50%': { boxShadow: '0 0 24px rgba(200,168,75,0.5)' },
        },
        'flicker': {
          '0%, 100%': { opacity: '1' },
          '33%': { opacity: '0.92' },
          '66%': { opacity: '0.96' },
          '80%': { opacity: '0.88' },
        },
        'rise': {
          from: { opacity: '0', transform: 'translateY(20px) scale(0.98)' },
          to: { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        'blood-drip': {
          '0%': { backgroundPosition: '0% 0%' },
          '100%': { backgroundPosition: '0% 100%' },
        },
      },
      animation: {
        'pin-pulse': 'pin-pulse 2.2s ease-in-out infinite',
        'page-fade': 'fade-in 450ms ease-out',
        'rise': 'rise 500ms ease-out',
        'glow-pulse': 'glow-pulse 3s ease-in-out infinite',
        'flicker': 'flicker 8s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
