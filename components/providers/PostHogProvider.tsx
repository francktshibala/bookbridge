'use client';

import { PostHogProvider as PHProvider } from 'posthog-js/react';
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, Suspense } from 'react';
import posthog from 'posthog-js';

if (typeof window !== 'undefined') {
  const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com';
  
  if (!posthogKey) {
    console.warn('⚠️ PostHog: NEXT_PUBLIC_POSTHOG_KEY is not set');
  } else {
    try {
      posthog.init(posthogKey, {
        api_host: posthogHost,
        person_profiles: 'identified_only', // Only create profiles for logged-in users
        capture_pageview: false, // We'll handle pageviews manually
        capture_pageleave: true,
        loaded: (posthog) => {
          console.log('📊 PostHog initialized successfully');
        }
      });
    } catch (error) {
      console.error('❌ PostHog initialization error:', error);
    }
  }
}

function PostHogPageViewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
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
  return (
    <PHProvider client={posthog}>
      <Suspense fallback={null}>
        <PostHogPageViewTracker />
      </Suspense>
      {children}
    </PHProvider>
  );
}

