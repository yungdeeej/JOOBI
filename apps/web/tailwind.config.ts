import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-jetbrains-mono)', 'ui-monospace', 'monospace'],
      },
      colors: {
        bg: {
          DEFAULT: '#09090b',
          elevated: '#18181b',
        },
        brand: {
          50: '#f5f3ff',
          100: '#ede9fe',
          200: '#ddd6fe',
          300: '#c4b5fd',
          400: '#a78bfa',
          500: '#8b5cf6',
          600: '#7c3aed',
          700: '#6d28d9',
          800: '#5b21b6',
          900: '#4c1d95',
        },
      },
      backgroundImage: {
        'gradient-brand':
          'linear-gradient(135deg, #8b5cf6 0%, #d946ef 50%, #ec4899 100%)',
        'gradient-radial':
          'radial-gradient(ellipse at top, rgba(139, 92, 246, 0.15), transparent 50%)',
        'gradient-mesh':
          'radial-gradient(at 20% 0%, rgba(139, 92, 246, 0.18), transparent 50%), radial-gradient(at 80% 50%, rgba(217, 70, 239, 0.10), transparent 50%), radial-gradient(at 30% 100%, rgba(56, 189, 248, 0.10), transparent 50%)',
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(139, 92, 246, 0.4), 0 8px 24px -8px rgba(139, 92, 246, 0.5)',
        soft: '0 8px 32px -12px rgba(0, 0, 0, 0.5)',
      },
      borderRadius: {
        xl: '0.875rem',
        '2xl': '1.125rem',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-1000px 0' },
          '100%': { backgroundPosition: '1000px 0' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.3s ease-out',
        shimmer: 'shimmer 2s linear infinite',
        'pulse-soft': 'pulse-soft 2s ease-in-out infinite',
        marquee: 'marquee 40s linear infinite',
      },
    },
  },
  plugins: [],
};

export default config;
