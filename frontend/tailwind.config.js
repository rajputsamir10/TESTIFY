/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Manrope', 'sans-serif'],
        heading: ['Space Grotesk', 'sans-serif'],
      },
      colors: {
        ink: '#0f172a',
        mist: '#e2e8f0',
        steel: '#334155',
        marine: '#0a3c7d',
        mint: '#0e766e',
        ember: '#9a3412',
      },
      boxShadow: {
        panel: '0 16px 35px -20px rgba(15, 23, 42, 0.45)',
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(18px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        fadeUp: 'fadeUp 0.45s ease-out both',
      },
    },
  },
  plugins: [],
}

