'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

export type ThemeVariant = 'light' | 'dark' | 'sepia';

interface ThemeContextValue {
  theme: ThemeVariant;
  setTheme: (theme: ThemeVariant) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<ThemeVariant>('light');
  const [mounted, setMounted] = useState(false);

  // Initialize theme from localStorage or system preference
  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem('bookbridge-theme') as ThemeVariant;
      if (savedTheme && ['light', 'dark', 'sepia'].includes(savedTheme)) {
        setThemeState(savedTheme);
      } else {
        // Default to light theme for Neo-Classic academic aesthetic
        const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        setThemeState(systemPrefersDark ? 'dark' : 'light');
      }
    } catch (error) {
      console.warn('Error loading theme from localStorage:', error);
      setThemeState('light');
    }
    setMounted(true);
  }, []);

  // Apply theme class to document
  useEffect(() => {
    if (mounted) {
      // Remove existing theme classes
      document.documentElement.classList.remove('theme-light', 'theme-dark', 'theme-sepia');
      // Add current theme class
      document.documentElement.classList.add(`theme-${theme}`);

      // Update meta theme-color for mobile browsers
      const metaThemeColor = document.querySelector('meta[name="theme-color"]');
      const themeColors = {
        light: '#F4F1EB', // Warm parchment
        dark: '#1A1611',  // Dark parchment
        sepia: '#F5E6D3'  // Warm sepia
      };

      if (metaThemeColor) {
        metaThemeColor.setAttribute('content', themeColors[theme]);
      }
    }
  }, [theme, mounted]);

  const setTheme = (newTheme: ThemeVariant) => {
    try {
      localStorage.setItem('bookbridge-theme', newTheme);
      setThemeState(newTheme);
      // Ensure document class updates immediately even if other providers re-render later
      document.documentElement.classList.remove('theme-light', 'theme-dark', 'theme-sepia');
      document.documentElement.classList.add(`theme-${newTheme}`);
    } catch (error) {
      console.warn('Error saving theme to localStorage:', error);
      setThemeState(newTheme);
    }
  };

  const toggleTheme = () => {
    const themeOrder: ThemeVariant[] = ['light', 'dark', 'sepia'];
    const currentIndex = themeOrder.indexOf(theme);
    const nextIndex = (currentIndex + 1) % themeOrder.length;
    setTheme(themeOrder[nextIndex]);
  };

  // Prevent hydration mismatch by not rendering until mounted
  if (!mounted) {
    return <div className="theme-light">{children}</div>;
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    // During SSR or when ThemeProvider is not available, return default values
    if (typeof window === 'undefined') {
      return {
        theme: 'light' as const,
        setTheme: () => {},
        toggleTheme: () => {}
      };
    }
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

// Hook for getting theme-aware styles
export function useThemeStyles() {
  const { theme } = useTheme();

  const getThemeValue = (lightValue: string, darkValue: string, sepiaValue: string) => {
    switch (theme) {
      case 'dark': return darkValue;
      case 'sepia': return sepiaValue;
      default: return lightValue;
    }
  };

  return { theme, getThemeValue };
}