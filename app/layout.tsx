import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { SkipLinks } from '@/components/SkipLinks';
import { AccessibilityProvider } from '@/contexts/AccessibilityContext';
import { KeyboardNavigationProvider } from '@/components/KeyboardNavigationProvider';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'BookBridge - Accessible AI Book Companion',
  description: 'An accessible AI-powered book companion designed for students with disabilities',
  keywords: 'accessible, AI, education, books, WCAG, screen reader',
  authors: [{ name: 'BookBridge Team' }],
  viewport: 'width=device-width, initial-scale=1, maximum-scale=5',
  themeColor: '#1a1a1a',
  manifest: '/manifest.json',
  openGraph: {
    title: 'BookBridge - Accessible AI Book Companion',
    description: 'AI-powered book analysis with 100% WCAG 2.1 AA compliance',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.className}>
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      </head>
      <body className="antialiased min-h-screen flex flex-col">
        <SkipLinks />
        
        {/* Live region for screen reader announcements */}
        <div 
          id="live-region" 
          aria-live="polite" 
          aria-atomic="true"
          className="sr-only"
        />
        
        {/* Error announcement region */}
        <div 
          id="error-region" 
          aria-live="assertive" 
          aria-atomic="true"
          className="sr-only"
        />
        
        <AccessibilityProvider>
          <KeyboardNavigationProvider>
            <header role="banner" className="bg-surface border-b border-gray-200">
            <nav role="navigation" aria-label="Main navigation" id="navigation" className="container mx-auto px-4 py-4">
              <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">
                  <a href="/" className="text-primary hover:text-accent-primary transition-colors">
                    BookBridge
                  </a>
                </h1>
                <div className="flex items-center gap-4">
                  <a 
                    href="/settings" 
                    className="btn-secondary"
                    aria-label="Accessibility settings"
                  >
                    Settings
                  </a>
                </div>
              </div>
            </nav>
          </header>
          
          <main 
            role="main" 
            aria-label="BookBridge application" 
            id="main-content"
            className="flex-1 container mx-auto px-4 py-8"
          >
            {children}
          </main>
          
          <footer role="contentinfo" className="bg-surface border-t border-gray-200 mt-auto">
            <div className="container mx-auto px-4 py-4">
              <p className="text-sm text-secondary text-center">
                © 2024 BookBridge. Built with accessibility first. 
                <a href="/accessibility" className="ml-2 underline hover:text-accent-primary">
                  Accessibility Statement
                </a>
              </p>
            </div>
          </footer>
          </KeyboardNavigationProvider>
        </AccessibilityProvider>
      </body>
    </html>
  );
}