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
  themeColor: '#0f172a',
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
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className="antialiased min-h-screen flex flex-col overflow-x-hidden magical-bg" style={{ backgroundColor: '#0f172a', color: '#ffffff' }}>
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
                className="flex-1 px-4 py-8 w-full"
                style={{ backgroundColor: 'transparent' }}
              >
                {children}
              </main>
              
              <footer role="contentinfo" className="mt-auto" style={{ 
                background: 'transparent',
                borderColor: 'transparent'
              }}>
                <div className="container mx-auto px-6 py-12" style={{ maxWidth: '1200px' }}>
                  <div className="text-center space-y-8" style={{ color: 'var(--text-secondary)' }}>
                    <p className="font-semibold" style={{ 
                      color: 'var(--text-primary)',
                      fontSize: 'var(--text-xl)'
                    }}>
                      © 2024 BookBridge. Built with accessibility first.
                    </p>
                    
                    <div className="max-w-4xl mx-auto p-8 rounded-2xl border text-center" style={{ 
                      backgroundColor: '#334155',
                      borderColor: '#475569',
                      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.2), 0 10px 20px rgba(0, 0, 0, 0.3)'
                    }}>
                      <h3 className="font-bold mb-4 text-gradient" style={{ 
                        fontSize: 'var(--text-2xl)'
                      }}>
                        Legal Disclaimer
                      </h3>
                      <p className="leading-relaxed" style={{ 
                        color: '#e2e8f0',
                        fontSize: 'var(--text-base)',
                        lineHeight: '1.6'
                      }}>
                        AI analysis is based on training knowledge and publicly available information, not text reproduction. 
                        BookBridge does not store or reproduce copyrighted content. All book analyses represent educational commentary 
                        and fair use discussion of literary works. Book content is sourced from public domain collections and official APIs.
                      </p>
                    </div>
                    
                    <div className="flex justify-center gap-12 flex-wrap">
                      <a 
                        href="/accessibility" 
                        className="footer-link hover:text-purple-400 transition-colors font-medium"
                        style={{ 
                          color: 'var(--text-secondary)', 
                          textDecoration: 'none',
                          fontSize: 'var(--text-lg)'
                        }}
                      >
                        Accessibility Statement
                      </a>
                      <a 
                        href="/privacy" 
                        className="footer-link hover:text-purple-400 transition-colors font-medium"
                        style={{ 
                          color: 'var(--text-secondary)', 
                          textDecoration: 'none',
                          fontSize: 'var(--text-lg)'
                        }}
                      >
                        Privacy Policy
                      </a>
                      <a 
                        href="/terms" 
                        className="footer-link hover:text-purple-400 transition-colors font-medium"
                        style={{ 
                          color: 'var(--text-secondary)', 
                          textDecoration: 'none',
                          fontSize: 'var(--text-lg)'
                        }}
                      >
                        Terms of Service
                      </a>
                    </div>
                  </div>
                </div>
              </footer>
            </VoiceNavigationWrapper>
          </KeyboardNavigationProvider>
        </AccessibilityProvider>
      </body>
    </html>
  );
}