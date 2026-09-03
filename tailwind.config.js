/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Geist', 'sans-serif'],
        mono: ['Geist Mono', 'monospace'],
      },
      colors: {
        background: 'var(--background)',
        surface: 'var(--surface)',
        surfaceHover: 'var(--surface-hover)',
        border: 'var(--border)',
        'border-strong': 'var(--border-strong)',
        primary: 'var(--primary)',
        'primary-hover': 'var(--primary-hover)',
        secondary: 'var(--secondary)',
        'text-main': 'var(--text-main)',
        'text-muted': 'var(--text-muted)',
        'text-subtle': 'var(--text-subtle)',
        success: 'var(--success)',
        warning: 'var(--warning)',
        danger: 'var(--danger)',
      },
      boxShadow: {
        'sm': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        'md': '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
        'lg': '0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -2px rgba(0, 0, 0, 0.03)',
        'panel': '0 0 0 1px rgba(0,0,0,0.03), 0 4px 12px rgba(0,0,0,0.05)',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out forwards',
        'slide-up': 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'pulse-slow': 'pulseSlow 8s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'marquee': 'marquee 30s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseSlow: {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.8', transform: 'scale(1.05)' },
        },
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        }
      }
    },
  },
  plugins: [],
}
