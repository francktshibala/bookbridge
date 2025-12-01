/**
 * Featured Books Page - Redirect to Catalog
 * 
 * Phase 7: Catalog Unification Cleanup
 * This page has been replaced by the unified catalog at /catalog
 * All Featured Books now route to /read/[slug] via the catalog
 * 
 * Legacy: Reading interface extracted to components/reading/BundleReadingInterface.tsx
 * Components folder kept for ReadingHeader, SettingsModal, ChapterModal (used by BundleReadingInterface)
 */

'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function FeaturedBooksRedirectContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const bookSlug = searchParams.get('book');

  useEffect(() => {
    // If book parameter exists, redirect to unified reading route
    if (bookSlug) {
      router.replace(`/read/${bookSlug}`);
    } else {
      // Otherwise redirect to catalog
      router.replace('/catalog');
    }
  }, [bookSlug, router]);

  // Show loading state during redirect
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{ borderColor: 'var(--accent-primary)' }}></div>
        <p style={{ fontFamily: '"Source Serif Pro", Georgia, serif', color: 'var(--text-secondary)' }}>
          Redirecting...
        </p>
      </div>
    </div>
  );
}

export default function FeaturedBooksPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{ borderColor: 'var(--accent-primary)' }}></div>
            <p style={{ fontFamily: '"Source Serif Pro", Georgia, serif', color: 'var(--text-secondary)' }}>
              Loading...
            </p>
          </div>
        </div>
      }
    >
      <FeaturedBooksRedirectContent />
    </Suspense>
  );
}
