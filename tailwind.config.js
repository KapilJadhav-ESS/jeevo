/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['"Plus Jakarta Sans"', '"Noto Sans Devanagari"', 'system-ui', 'sans-serif'] },
      colors: {
        brand: {
          50: '#EDFAF8', 100: '#D2F2EE', 200: '#A6E4DD', 300: '#6FCFC5', 400: '#38B2A6',
          500: '#16968B', 600: '#0E7C74', 700: '#0F655F', 800: '#11514D', 900: '#0E3B39'
        },
        accent: { 50: '#ECFDF3', 100: '#D1FADF', 400: '#4ADE80', 500: '#22C55E', 600: '#16A34A', 700: '#15803D' },
        ink: { 900: '#0F172A', 700: '#334155', 500: '#64748B', 400: '#94A3B8', 300: '#CBD5E1', 200: '#E2E8F0', 100: '#F1F5F9' },
        canvas: '#F6F9F9'
      },
      boxShadow: {
        card: '0 1px 2px rgba(15,23,42,.04), 0 4px 16px rgba(15,23,42,.05)',
        float: '0 8px 30px rgba(14,59,57,.28)'
      },
      borderRadius: { '2xl': '1rem', '3xl': '1.5rem' },
      keyframes: {
        'slide-up': { from: { transform: 'translateY(100%)' }, to: { transform: 'translateY(0)' } },
        'fade-in': { from: { opacity: 0 }, to: { opacity: 1 } },
        pop: { '0%': { transform: 'scale(.9)', opacity: 0 }, '100%': { transform: 'scale(1)', opacity: 1 } }
      },
      animation: {
        'slide-up': 'slide-up .25s cubic-bezier(.2,.8,.2,1)',
        'fade-in': 'fade-in .2s ease-out',
        pop: 'pop .2s ease-out'
      }
    }
  },
  plugins: []
}
