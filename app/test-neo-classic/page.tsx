'use client';

import { useTheme } from '@/contexts/ThemeContext';
import { ThemeSwitcher } from '@/components/theme/ThemeSwitcher';
import { motion } from 'framer-motion';

export default function TestNeoClassicPage() {
  const { theme } = useTheme();

  return (
    <div className="neo-classic-surface min-h-screen theme-transition" style={{ background: 'var(--bg-primary)' }}>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h1 className="neo-classic-title text-4xl mb-4">
            Neo-Classic Theme System Demo
          </h1>
          <p className="neo-classic-subtitle text-lg mb-8">
            Testing the complete implementation of our academic prestige theme system
          </p>

          {/* Theme Switcher */}
          <div className="flex justify-center mb-8">
            <ThemeSwitcher size="lg" />
          </div>

          <div className="neo-classic-caption">
            Current Theme: {theme}
          </div>
        </motion.div>

        {/* Content Grid */}
        <div className="grid md:grid-cols-2 gap-8 mb-12">
          {/* Typography Showcase */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="neo-classic-card p-6"
          >
            <h2 className="neo-classic-title text-2xl mb-4">Typography System</h2>
            <div className="space-y-4">
              <div>
                <h3 className="neo-classic-subtitle text-lg mb-2">Playfair Display Headings</h3>
                <div className="neo-classic-title text-base">Elegant serif typography for academic prestige</div>
              </div>
              <div>
                <h3 className="neo-classic-subtitle text-lg mb-2">Source Serif Pro Body</h3>
                <div className="neo-classic-body">
                  This readable serif font provides excellent legibility for extended reading sessions.
                  The carefully chosen line height and letter spacing ensure optimal reading comfort.
                </div>
              </div>
              <div>
                <h3 className="neo-classic-subtitle text-lg mb-2">Caption Style</h3>
                <div className="neo-classic-caption">
                  Small caps styling for metadata and labels
                </div>
              </div>
            </div>
          </motion.div>

          {/* Color Palette */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="neo-classic-card p-6"
          >
            <h2 className="neo-classic-title text-2xl mb-4">Color System</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-2">
                <div className="h-12 rounded" style={{ background: 'var(--bg-primary)' }} title="Primary Background"></div>
                <div className="h-12 rounded" style={{ background: 'var(--bg-secondary)' }} title="Secondary Background"></div>
                <div className="h-12 rounded" style={{ background: 'var(--bg-tertiary)' }} title="Tertiary Background"></div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="h-12 rounded" style={{ background: 'var(--accent-primary)' }} title="Primary Accent"></div>
                <div className="h-12 rounded" style={{ background: 'var(--accent-secondary)' }} title="Secondary Accent"></div>
              </div>
              <div className="neo-classic-body text-sm">
                Dynamic color system that adapts to Light, Dark, and Sepia themes
              </div>
            </div>
          </motion.div>
        </div>

        {/* Component Showcase */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="neo-classic-card p-8 mb-12"
        >
          <h2 className="neo-classic-title text-2xl mb-6">Component Examples</h2>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Buttons */}
            <div>
              <h3 className="neo-classic-subtitle text-lg mb-4">Buttons</h3>
              <div className="space-y-4">
                <button className="neo-classic-button">
                  Primary Button
                </button>
                <button className="neo-classic-button-secondary">
                  Secondary Button
                </button>
              </div>
            </div>

            {/* Form Elements */}
            <div>
              <h3 className="neo-classic-subtitle text-lg mb-4">Form Elements</h3>
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Enter text here..."
                  className="neo-classic-input w-full"
                />
                <textarea
                  placeholder="Enter longer text here..."
                  className="neo-classic-input w-full h-20 resize-none"
                />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Reading Experience Mockup */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="neo-classic-reading-container mb-12"
        >
          <h2 className="neo-classic-title text-2xl mb-6">Reading Experience</h2>
          <div className="neo-classic-reading-text">
            <p className="mb-4">
              "It is a truth universally acknowledged, that a single man in possession of a good fortune,
              must be in want of a wife." This iconic opening line from Jane Austen's <em>Pride and Prejudice</em>
              demonstrates how our Neo-Classic theme enhances the reading experience.
            </p>
            <p className="mb-4">
              The carefully selected typography, optimal line spacing, and academic color palette create
              an environment conducive to focused, comfortable reading. Whether in bright daylight with
              the Light theme, during evening study sessions with the Dark theme, or for extended reading
              with the gentle Sepia theme, readers can customize their experience.
            </p>
            <p>
              This theme system transforms BookBridge from a functional ESL tool into a premium
              academic reading platform worthy of the world's greatest literature.
            </p>
          </div>
        </motion.div>

        {/* Technical Details */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1.0 }}
          className="neo-classic-surface-elevated p-6 rounded-lg"
        >
          <h2 className="neo-classic-title text-xl mb-4">Implementation Details</h2>
          <div className="neo-classic-body text-sm space-y-2">
            <div><strong>Theme System:</strong> CSS custom properties with React Context</div>
            <div><strong>Typography:</strong> Google Fonts (Playfair Display + Source Serif Pro)</div>
            <div><strong>Color Variants:</strong> Light, Dark, Sepia themes</div>
            <div><strong>Accessibility:</strong> WCAG AA compliant contrast ratios</div>
            <div><strong>Performance:</strong> Optimized font loading and minimal CSS overhead</div>
            <div><strong>Persistence:</strong> Theme preference saved to localStorage</div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}