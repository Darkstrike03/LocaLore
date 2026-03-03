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
        // ── Card animations ───────────────────────────────────────────────────
        'card-flip': {
          '0%':   { transform: 'perspective(800px) rotateY(0deg)' },
          '50%':  { transform: 'perspective(800px) rotateY(90deg)' },
          '100%': { transform: 'perspective(800px) rotateY(0deg)' },
        },
        'card-rise': {
          from: { opacity: '0', transform: 'perspective(800px) translateY(40px) rotateX(8deg) scale(0.94)' },
          to:   { opacity: '1', transform: 'perspective(800px) translateY(0) rotateX(0deg) scale(1)' },
        },
        'foil-sweep': {
          '0%':   { backgroundPosition: '200% center' },
          '100%': { backgroundPosition: '-200% center' },
        },
        'hue-cycle': {
          '0%':   { filter: 'hue-rotate(0deg) saturate(1.6)' },
          '100%': { filter: 'hue-rotate(360deg) saturate(1.6)' },
        },
        'void-glitch': {
          '0%, 90%, 100%': { clipPath: 'inset(0 0 0 0)', transform: 'translate(0)' },
          '92%': { clipPath: 'inset(20% 0 30% 0)', transform: 'translate(-4px, 1px)' },
          '94%': { clipPath: 'inset(50% 0 10% 0)', transform: 'translate(4px, -2px)' },
          '96%': { clipPath: 'inset(10% 0 60% 0)', transform: 'translate(-2px, 3px)' },
          '98%': { clipPath: 'inset(0 0 0 0)', transform: 'translate(0)' },
        },
        'ephemeral-border': {
          '0%, 100%': { borderColor: 'rgba(167,139,250,0.5)' },
          '33%': { borderColor: 'rgba(236,72,153,0.6)' },
          '66%': { borderColor: 'rgba(99,102,241,0.7)' },
        },
        'pack-shake': {
          '0%, 100%': { transform: 'rotate(0deg)' },
          '20%': { transform: 'rotate(-3deg) scale(1.02)' },
          '40%': { transform: 'rotate(3deg) scale(1.04)' },
          '60%': { transform: 'rotate(-2deg) scale(1.02)' },
          '80%': { transform: 'rotate(2deg)' },
        },
        'market-ticker': {
          from: { transform: 'translateX(0)' },
          to:   { transform: 'translateX(-50%)' },
        },
        'count-up': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        'auction-pulse': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(239,68,68,0)' },
          '50%': { boxShadow: '0 0 0 6px rgba(239,68,68,0.15)' },
        },
      },
      animation: {
        'pin-pulse': 'pin-pulse 2.2s ease-in-out infinite',
        'page-fade': 'fade-in 450ms ease-out',
        'rise': 'rise 500ms ease-out',
        'glow-pulse': 'glow-pulse 3s ease-in-out infinite',
        'flicker': 'flicker 8s ease-in-out infinite',
        // ── Card animations ────────────────────────────────────────────────────
        'card-flip':        'card-flip 0.6s ease-in-out',
        'card-rise':        'card-rise 500ms cubic-bezier(0.16,1,0.3,1) forwards',
        'foil-sweep':       'foil-sweep 3s linear infinite',
        'hue-cycle':        'hue-cycle 6s linear infinite',
        'void-glitch':      'void-glitch 5s ease-in-out infinite',
        'ephemeral-border': 'ephemeral-border 3s ease-in-out infinite',
        'pack-shake':       'pack-shake 0.5s ease-in-out',
        'market-ticker':    'market-ticker 30s linear infinite',
        'count-up':         'count-up 300ms ease-out forwards',
        'auction-pulse':    'auction-pulse 2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
