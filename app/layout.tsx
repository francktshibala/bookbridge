import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import Script from 'next/script';
import './globals.css';
import '../styles/wireframe-typography.css';
import { SkipLinks } from '@/components/SkipLinks';
import { CapacitorWrapper } from '@/components/CapacitorWrapper';
import { AccessibilityProvider } from '@/contexts/AccessibilityContext';
import { KeyboardNavigationProvider } from '@/components/KeyboardNavigationProvider';
import Navigation from '@/components/Navigation';
import { VoiceNavigationWrapper } from '@/components/VoiceNavigationWrapper';
import { SimpleAuthProvider } from '@/components/SimpleAuthProvider';
import { ConditionalFooter } from '@/components/ConditionalFooter';
import OnboardingManager from '@/components/onboarding/OnboardingManager';
import { PerformanceProvider } from '@/components/PerformanceProvider';
import DeploymentInitializer from '@/components/DeploymentInitializer';
import { PostHogProvider } from '@/components/providers/PostHogProvider';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { AudioProvider } from '@/contexts/AudioContext';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'BookBridge - Classic Literature & Modern Stories for ESL Learners',
  description: 'Read classic literature and inspiring modern stories simplified to your English level (A1-C2). Perfect audio-text sync, AI tutor, and vocabulary help.',
  keywords: 'ESL, English learning, classic literature, modern stories, simplified books, CEFR levels, audio books, AI tutor',
  authors: [{ name: 'BookBridge Team' }],
  manifest: '/manifest.json',
  openGraph: {
    title: 'BookBridge - Classic Literature & Modern Stories for ESL Learners',
    description: 'Read classic literature and inspiring modern stories simplified to your English level with perfect audio-text sync',
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
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.className} theme-light`} suppressHydrationWarning>
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body
        className="antialiased min-h-screen flex flex-col overflow-x-hidden theme-transition"
        suppressHydrationWarning
      >
        {/* Google Analytics */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-R209NKPNVN"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-R209NKPNVN');
          `}
        </Script>

        {/* Theme initialization script to prevent FOUC */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var root = document.documentElement;
                  var saved = localStorage.getItem('bookbridge-theme');
                  var theme = (saved && ['light','dark','sepia'].indexOf(saved) !== -1) ? saved : 'light';
                  root.classList.remove('theme-light','theme-dark','theme-sepia');
                  root.classList.add('theme-' + theme);
                } catch (e) {
                  document.documentElement.classList.add('theme-light');
                }
              })();
            `
          }}
        />
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
        
        <PostHogProvider>
          <ThemeProvider>
            <AudioProvider>
              <SimpleAuthProvider>
              <AccessibilityProvider>
              <KeyboardNavigationProvider>
                <VoiceNavigationWrapper>
                  <PerformanceProvider enableMonitoring={true} enableAnalytics={true}>
                      <OnboardingManager enableAutoOnboarding={true}>
                {/* Capacitor App Listener */}
                <CapacitorWrapper />
                
                <Navigation />
              
                <main 
                  role="main" 
                  aria-label="BookBridge application" 
                  id="main-content"
                  className="flex-1 px-0 md:px-4 py-0 w-full"
                  style={{ backgroundColor: 'transparent' }}
                >
                  {children}
                </main>
                
                <ConditionalFooter />
                
                {/* Deployment Initialization */}
                <DeploymentInitializer />
                      </OnboardingManager>
                  </PerformanceProvider>
                </VoiceNavigationWrapper>
              </KeyboardNavigationProvider>
              </AccessibilityProvider>
            </SimpleAuthProvider>
          </AudioProvider>
        </ThemeProvider>
        </PostHogProvider>
      </body>
    </html>
  );
}