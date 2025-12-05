/**
 * Catalog Page
 * Book discovery and browsing interface
 * Phase 6: Integration of all catalog components
 * References: BOOK_ORGANIZATION_SCHEMES.md
 */

'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CatalogProvider } from '@/contexts/CatalogContext';
import { CatalogBrowser } from '@/components/catalog/CatalogBrowser';
import { useAuth } from '@/components/AuthProvider';
import type { UnifiedBook } from '@/types/unified-book';
import { isFeaturedBook, isEnhancedBook } from '@/types/unified-book';

function CatalogContent() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [authCheckTimeout, setAuthCheckTimeout] = useState(false);

  // Require authentication - redirect to login if not logged in
  useEffect(() => {
    // Timeout fallback: If auth check takes too long (2 seconds), redirect anyway
    const timeoutId = setTimeout(() => {
      console.log('[Catalog] Auth check timeout - redirecting to login');
      setAuthCheckTimeout(true);
      router.push('/auth/login?redirectTo=/catalog');
    }, 2000);

    // Once loading completes, clear timeout and check auth
    if (!loading) {
      clearTimeout(timeoutId);
      if (!user) {
        console.log('[Catalog] User not authenticated - redirecting to login');
        router.push('/auth/login?redirectTo=/catalog');
      }
    }

    return () => clearTimeout(timeoutId);
  }, [user, loading, router]);

  const handleSelectBook = (book: UnifiedBook) => {
    // Phase 8: Unified routing - handle both Featured Books and Enhanced Books
    if (isFeaturedBook(book) && book.slug) {
      // Featured Books (bundle architecture) → /read/[slug]
      router.push(`/read/${book.slug}`);
    } else if (isEnhancedBook(book)) {
      // Enhanced Books (chunk architecture) → /library/[id]/read
      router.push(`/library/${book.id}/read`);
    } else {
      console.error('Unknown book architecture:', book);
    }
  };

  const handleAskAI = (book: UnifiedBook) => {
    // TODO: Implement AI chat modal for books
    console.log('Ask AI about:', book.title);
  };

  // Show loading state while checking auth (but not if timeout triggered redirect)
  if (loading && !authCheckTimeout) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{ borderColor: 'var(--accent-primary)' }}></div>
          <p style={{ fontFamily: '"Source Serif Pro", Georgia, serif', color: 'var(--text-secondary)' }}>
            Checking authentication...
          </p>
        </div>
      </div>
    );
  }

  // Don't render catalog if not authenticated (will redirect)
  if (!user || authCheckTimeout) {
    return null;
  }

  return (
    <CatalogProvider>
      <CatalogBrowser
        onSelectBook={handleSelectBook}
        onAskAI={handleAskAI}
      />
    </CatalogProvider>
  );
}

export default function CatalogPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{ borderColor: 'var(--accent-primary)' }}></div>
          <p style={{ fontFamily: '"Source Serif Pro", Georgia, serif', color: 'var(--text-secondary)' }}>
            Loading catalog...
          </p>
        </div>
      </div>
    }>
      <CatalogContent />
    </Suspense>
  );
}
