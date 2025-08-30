import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import '../styles/wireframe-typography.css';
import { SkipLinks } from '@/components/SkipLinks';
import { AccessibilityProvider } from '@/contexts/AccessibilityContext';
import { KeyboardNavigationProvider } from '@/components/KeyboardNavigationProvider';
import Navigation from '@/components/Navigation';
import { VoiceNavigationWrapper } from '@/components/VoiceNavigationWrapper';
import { SimpleAuthProvider } from '@/components/SimpleAuthProvider';
import { ConditionalFooter } from '@/components/ConditionalFooter';
import InstallPrompt from '@/components/InstallPrompt';
import OfflineIndicator from '@/components/offline/OfflineIndicator';

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
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon-192.png', type: 'image/png', sizes: '192x192' },
      { url: '/icon-512.png', type: 'image/png', sizes: '512x512' },
    ],
    apple: [
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
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
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body 
        className="antialiased min-h-screen flex flex-col overflow-x-hidden magical-bg" 
        style={{ backgroundColor: '#0f172a', color: '#ffffff' }}
        suppressHydrationWarning
      >
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
        
        <SimpleAuthProvider>
          <AccessibilityProvider>
            <KeyboardNavigationProvider>
              <VoiceNavigationWrapper>
                {/* PWA Offline Indicator */}
                <OfflineIndicator />
                
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
                
                <ConditionalFooter />
                
                {/* PWA Install Prompt */}
                <InstallPrompt />
              </VoiceNavigationWrapper>
            </KeyboardNavigationProvider>
          </AccessibilityProvider>
        </SimpleAuthProvider>
      </body>
    </html>
  );
}