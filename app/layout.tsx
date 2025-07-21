import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { SkipLinks } from '@/components/SkipLinks';
import { AccessibilityProvider } from '@/contexts/AccessibilityContext';
import { KeyboardNavigationProvider } from '@/components/KeyboardNavigationProvider';
import Navigation from '@/components/Navigation';
import { VoiceNavigationWrapper } from '@/components/VoiceNavigationWrapper';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'BookBridge - Accessible AI Book Companion',
  description: 'An accessible AI-powered book companion designed for students with disabilities',
  keywords: 'accessible, AI, education, books, WCAG, screen reader',
  authors: [{ name: 'BookBridge Team' }],
  manifest: '/manifest.json',
  openGraph: {
    title: 'BookBridge - Accessible AI Book Companion',
    description: 'AI-powered book analysis with 100% WCAG 2.1 AA compliance',
    type: 'website',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#1a1a1a',
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
            <VoiceNavigationWrapper>
              <Navigation />
            
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
            </VoiceNavigationWrapper>
          </KeyboardNavigationProvider>
        </AccessibilityProvider>
      </body>
    </html>
  );
}