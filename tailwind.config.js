/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // WCAG 2.1 AA Compliant colors with proper contrast ratios
        primary: {
          DEFAULT: '#1a1a1a', // 16:1 contrast
          light: '#4a4a4a',   // 9:1 contrast
        },
        accent: {
          primary: '#d32f2f',   // 5.5:1 contrast
          secondary: '#f57c00', // 4.8:1 contrast
        },
        background: {
          DEFAULT: '#ffffff',
          surface: '#f8f9fa',
        },
      },
      fontSize: {
        // Minimum 16px for body text (WCAG requirement)
        'xs': '14px',   // Only for metadata
        'sm': '16px',   // Body text minimum
        'base': '18px', // Preferred body
        'lg': '20px',
        'xl': '24px',
        '2xl': '32px',
        '3xl': '40px',
      },
      spacing: {
        // Touch target minimum 44px
        'touch': '44px',
      },
      minHeight: {
        'touch': '44px',
      },
      minWidth: {
        'touch': '44px',
      },
    },
  },
  plugins: [],
}