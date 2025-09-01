'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export function CapacitorAppListener() {
  const router = useRouter();

  useEffect(() => {
    const initializeCapacitorApp = async () => {
      try {
        // Only import Capacitor on client side and when available
        const { App } = await import('@capacitor/app');
        const { Capacitor } = await import('@capacitor/core');
        
        if (Capacitor.isNativePlatform()) {
          // Handle deep links
          App.addListener('appUrlOpen', (event) => {
            const slug = event.url.split('.app').pop();
            if (slug) {
              router.push(slug);
            }
          });

          // Handle app state changes
          App.addListener('appStateChange', ({ isActive }) => {
            if (isActive) {
              // App became active - could resume audio playback here
              console.log('📱 App became active');
            } else {
              // App went to background - could pause audio here
              console.log('📱 App went to background');
            }
          });

          // Handle back button on Android
          App.addListener('backButton', ({ canGoBack }) => {
            if (!canGoBack) {
              App.exitApp();
            } else {
              router.back();
            }
          });
        }
      } catch (error) {
        // Gracefully handle when Capacitor is not available (web mode)
        console.log('Capacitor not available, running in web mode');
      }
    };

    initializeCapacitorApp();

    // Cleanup function
    return () => {
      // Only cleanup if we're in a Capacitor environment
      if (typeof window !== 'undefined') {
        import('@capacitor/app').then(({ App }) => {
          App.removeAllListeners();
        }).catch(() => {
          // Gracefully handle cleanup errors
        });
      }
    };
  }, [router]);

  return null;
}