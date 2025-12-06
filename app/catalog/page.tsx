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
import { supabase } from '@/lib/supabase/client';

function CatalogContent() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [authChecking, setAuthChecking] = useState(true);
  const [hasRedirected, setHasRedirected] = useState(false);

  // Require authentication - wait for auth state to settle before redirecting
  useEffect(() => {
    let cancelled = false;

    const verifySessionBeforeRedirect = async () => {
      if (user) {
        console.log('[Catalog] Auth confirmed via context user');
        setAuthChecking(false);
        return;
      }

      if (loading || hasRedirected) {
        console.log('[Catalog] Waiting for auth to settle', { loading, hasRedirected });
        return;
      }

      setAuthChecking(true);
      console.log('[Catalog] No user yet, polling Supabase session to avoid false redirect');

      const maxAttempts = 5;
      for (let attempt = 1; attempt <= maxAttempts && !cancelled; attempt++) {
        const { data: { session } } = await supabase.auth.getSession();
        const hasSessionUser = !!session?.user;
        console.log(`[Catalog] Session poll attempt ${attempt}`, { hasSession: hasSessionUser });

        if (hasSessionUser) {
          console.log('[Catalog] Session detected, waiting for AuthProvider to update user');
          return;
        }

        await new Promise((resolve) => setTimeout(resolve, 200));
      }

      if (!cancelled) {
        console.log('[Catalog] No session found after retries - redirecting to login');
        setHasRedirected(true);
        setAuthChecking(false);
        router.push('/auth/login?redirectTo=/catalog');
      }
    };

    verifySessionBeforeRedirect();

    return () => {
      cancelled = true;
    };
  }, [user, loading, router, hasRedirected]);

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

  // Show loading state while checking auth (but not if redirect already triggered)
  if ((loading || authChecking) && !hasRedirected) {
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
  if (!user || hasRedirected) {
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
