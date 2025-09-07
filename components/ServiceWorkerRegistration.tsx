'use client';

import { useEffect } from 'react';

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    // In development, or when running the dev server locally after a prod build
    // has previously installed a SW on this origin, aggressively unregister SWs
    // and clear caches to prevent stale UI/assets from persisting.
    if (process.env.NODE_ENV !== 'production') {
      (async () => {
        try {
          const registrations = await navigator.serviceWorker.getRegistrations();
          for (const registration of registrations) {
            try {
              await registration.unregister();
              // Also try to stop any active controller
              registration.active?.postMessage?.({ type: 'SKIP_WAITING' });
            } catch (err) {
              console.warn('SW unregister failed:', err);
            }
          }
          if ('caches' in window) {
            const cacheNames = await caches.keys();
            await Promise.all(
              cacheNames.map((name) =>
                caches.delete(name).catch((err) => {
                  console.warn('Cache delete failed:', name, err);
                  return false;
                })
              )
            );
          }
          // Force a hard reload to ensure fresh assets if a controller was present
          if (navigator.serviceWorker.controller) {
            window.location.reload();
          }
          console.log('🧹 Development: service workers unregistered and caches cleared');
        } catch (e) {
          console.warn('Development SW cleanup encountered an error:', e);
        }
      })();
      return;
    }

    // Production: register the service worker normally
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        console.log('✅ SW registered:', registration);
      })
      .catch((error) => {
        console.error('❌ SW registration failed:', error);
      });
  }, []);

  return null;
}