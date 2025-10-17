'use client';

import { useTheme, type ThemeVariant } from '@/contexts/ThemeContext';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

interface ThemeSwitcherProps {
  className?: string;
  showLabels?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

// SSR-safe wrapper component
export function ThemeSwitcher(props: ThemeSwitcherProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <ThemeSwitcherPlaceholder {...props} />;
  }

  return <ThemeSwitcherClient {...props} />;
}

// Static placeholder for SSR
function ThemeSwitcherPlaceholder({
  className = '',
  showLabels = true,
  size = 'md'
}: ThemeSwitcherProps) {
  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-2',
    lg: 'text-base px-4 py-3'
  };

  return (
    <div className={`theme-switcher ${className}`}>
      <div className="neo-classic-control-group">
        {showLabels && (
          <label className="neo-classic-label text-xs uppercase tracking-wide mb-2 block">
            Reading Theme
          </label>
        )}
        <div className="theme-selector-buttons flex rounded-lg overflow-hidden border border-[var(--border-light)]">
          <div className={`theme-btn flex-1 bg-[var(--accent-primary)] text-[var(--bg-primary)] font-semibold ${sizeClasses[size]}`}>
            ☀️ {showLabels && 'Light'}
          </div>
        </div>
      </div>
    </div>
  );
}

// Client-side component that uses theme context
function ThemeSwitcherClient({
  className = '',
  showLabels = true,
  size = 'md'
}: ThemeSwitcherProps) {
  const { theme, setTheme } = useTheme();

  const themes: { value: ThemeVariant; label: string; icon: string; description: string }[] = [
    {
      value: 'light',
      label: 'Light',
      icon: '☀️',
      description: 'Classic academic light theme'
    },
    {
      value: 'dark',
      label: 'Dark',
      icon: '🌙',
      description: 'Elegant dark reading mode'
    },
    {
      value: 'sepia',
      label: 'Sepia',
      icon: '📜',
      description: 'Warm vintage paper tone'
    }
  ];

  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-2',
    lg: 'text-base px-4 py-3'
  };

  return (
    <div className={`theme-switcher ${className}`}>
      <div className="neo-classic-control-group">
        {showLabels && (
          <label className="neo-classic-label text-xs uppercase tracking-wide mb-2 block">
            Reading Theme
          </label>
        )}

        <div className="theme-selector-buttons flex rounded-lg overflow-hidden border border-[var(--border-light)]">
          {themes.map((themeOption, index) => (
            <motion.button
              key={themeOption.value}
              onClick={() => setTheme(themeOption.value)}
              className={`
                theme-btn flex-1 relative transition-all duration-300 font-medium
                ${sizeClasses[size]}
                ${theme === themeOption.value
                  ? 'bg-[var(--accent-primary)] text-[var(--bg-primary)] font-semibold'
                  : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--accent-primary)] hover:bg-opacity-10'
                }
                ${index === 0 ? '' : 'border-l border-[var(--border-light)]'}
              `}
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.98 }}
              title={themeOption.description}
            >
              <span className="flex items-center justify-center gap-1.5">
                <span className="theme-icon">{themeOption.icon}</span>
                {showLabels && (
                  <span className="theme-label">{themeOption.label}</span>
                )}
              </span>

              {/* Active indicator */}
              {theme === themeOption.value && (
                <motion.div
                  className="absolute inset-0 bg-[var(--accent-primary)] opacity-10 rounded"
                  layoutId="activeTheme"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
            </motion.button>
          ))}
        </div>
      </div>

      <style jsx>{`
        .theme-switcher {
          font-family: 'Source Serif Pro', Georgia, serif;
        }

        .neo-classic-control-group {
          position: relative;
        }

        .neo-classic-label {
          color: var(--text-secondary);
          font-family: 'Source Serif Pro', Georgia, serif;
          font-weight: 600;
        }

        .theme-btn {
          position: relative;
          border: none;
          cursor: pointer;
          font-family: 'Source Serif Pro', Georgia, serif;
          letter-spacing: 0.02em;
        }

        .theme-btn:focus {
          outline: none;
          box-shadow: 0 0 0 2px var(--accent-primary), 0 0 0 4px rgba(var(--accent-primary-rgb), 0.2);
        }

        .theme-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        @media (max-width: 640px) {
          .theme-label {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}

// Compact floating theme switcher for corner placement
export function FloatingThemeSwitcher({ className = '' }: { className?: string }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <FloatingThemeSwitcherPlaceholder className={className} />;
  }

  return <FloatingThemeSwitcherClient className={className} />;
}

// Static placeholder for SSR
function FloatingThemeSwitcherPlaceholder({ className = '' }: { className?: string }) {
  return (
    <div className={`floating-theme-switcher fixed top-4 right-4 z-50 w-12 h-12 rounded-full flex items-center justify-center bg-[var(--bg-secondary)] border border-[var(--border-light)] ${className}`}>
      <span className="text-lg">☀️</span>
    </div>
  );
}

// Client-side component that uses theme context
function FloatingThemeSwitcherClient({ className = '' }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();

  const themeIcons = {
    light: '☀️',
    dark: '🌙',
    sepia: '📜'
  };

  return (
    <motion.button
      onClick={toggleTheme}
      className={`
        floating-theme-switcher fixed top-4 right-4 z-50
        w-12 h-12 rounded-full flex items-center justify-center
        bg-[var(--bg-secondary)] border border-[var(--border-light)]
        shadow-lg hover:shadow-xl transition-all duration-300
        ${className}
      `}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      title={`Current theme: ${theme}. Click to cycle themes.`}
    >
      <span className="text-lg">{themeIcons[theme]}</span>

      <style jsx>{`
        .floating-theme-switcher {
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
        }

        .floating-theme-switcher:focus {
          outline: none;
          box-shadow: 0 0 0 2px var(--accent-primary), 0 4px 20px rgba(0, 0, 0, 0.15);
        }
      `}</style>
    </motion.button>
  );
}