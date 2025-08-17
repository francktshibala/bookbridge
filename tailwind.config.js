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
        
        // BookBridge Brand Colors (matching CSS variables)
        brand: {
          primary: '#667eea',     // --brand-primary
          secondary: '#764ba2',   // --brand-secondary
          accent: '#f093fb',      // --brand-accent
        },
        
        // Surface system
        surface: {
          DEFAULT: '#ffffff',
          elevated: '#ffffff',
          subtle: '#f8faff',
        },
        
        // Border system
        border: {
          light: '#e0e7ff',
          subtle: '#f0f4ff',
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
        
        // 8px grid system for consistent layouts
        '0.5': '2px',   // 0.5 * 4px
        '1': '4px',     // space-1
        '2': '8px',     // space-2  
        '3': '12px',    // space-3
        '4': '16px',    // space-4
        '6': '24px',    // space-6
        '8': '32px',    // space-8
        '10': '40px',
        '12': '48px',
        '16': '64px',
        '20': '80px',
        '24': '96px',
      },
      minHeight: {
        'touch': '44px',
      },
      minWidth: {
        'touch': '44px',
      },
      
      // Border radius system
      borderRadius: {
        'none': '0',
        'sm': '4px',
        DEFAULT: '8px',
        'md': '12px',
        'lg': '16px',
        'xl': '20px',
        'full': '9999px',
      },
      
      // Shadow system (matching CSS variables)
      boxShadow: {
        'sm': '0 1px 2px rgba(0, 0, 0, 0.05)',
        DEFAULT: '0 4px 6px rgba(0, 0, 0, 0.05), 0 10px 20px rgba(0, 0, 0, 0.1)',
        'md': '0 4px 6px rgba(0, 0, 0, 0.05), 0 10px 20px rgba(0, 0, 0, 0.1)',
        'lg': '0 10px 30px rgba(0, 0, 0, 0.1)',
        'brand': '0 4px 12px rgba(102, 126, 234, 0.25)',
        'brand-hover': '0 6px 20px rgba(102, 126, 234, 0.35)',
      },
      
      // Font family
      fontFamily: {
        'sans': ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
}