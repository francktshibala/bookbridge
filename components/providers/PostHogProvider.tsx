'use client';

import { PostHogProvider as PHProvider } from 'posthog-js/react';
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, Suspense, useState } from 'react';
import posthog from 'posthog-js';

function PostHogInitializer() {
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Only initialize on client side
    if (typeof window === 'undefined') return;

    const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com';
    
    if (!posthogKey) {
      console.warn('⚠️ PostHog: NEXT_PUBLIC_POSTHOG_KEY is not set');
      return;
    }

    // Check if already initialized
    if (posthog.__loaded) {
      setIsInitialized(true);
      return;
    }

    try {
      posthog.init(posthogKey, {
        api_host: posthogHost,
        person_profiles: 'identified_only', // Only create profiles for logged-in users
        capture_pageview: false, // We'll handle pageviews manually
        capture_pageleave: true,
        loaded: (posthog) => {
          console.log('📊 PostHog initialized successfully');
          setIsInitialized(true);
        }
      });
    } catch (error) {
      console.error('❌ PostHog initialization error:', error);
    }
  }, []);

  return null;
}

function PostHogPageViewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Only track on client side
    if (typeof window === 'undefined') return;
    
    // Track pageviews
    if (pathname) {
      let url = window.origin + pathname;
      if (searchParams && searchParams.toString()) {
        url = url + `?${searchParams.toString()}`;
      }
      console.log('📊 PostHog: Capturing pageview for', url);
      posthog.capture('$pageview', {
        $current_url: url,
      });
    }
  }, [pathname, searchParams]);

  return null;
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Don't render PostHog provider during SSR to prevent hydration mismatches
  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <PHProvider client={posthog}>
      <PostHogInitializer />
      <Suspense fallback={null}>
        <PostHogPageViewTracker />
      </Suspense>
      {children}
    </PHProvider>
  );
}

