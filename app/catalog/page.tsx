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
import { useAuth } from '@/components/SimpleAuthProvider';
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
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const verifySessionBeforeRedirect = async () => {
      if (hasRedirected) {
        return;
      }

      // If user exists, we're authenticated
      if (user) {
        console.log('[Catalog] Auth confirmed via context user');
        setAuthChecking(false);
        return;
      }

      // If still loading, wait a bit but set timeout fallback
      if (loading) {
        console.log('[Catalog] Auth still loading, waiting...');
        // Set timeout: if loading takes more than 2 seconds, redirect anyway
        timeoutId = setTimeout(() => {
          if (!cancelled && !hasRedirected) {
            console.log('[Catalog] Loading timeout - redirecting to login');
            setHasRedirected(true);
            setAuthChecking(false);
            router.push('/auth/login?redirectTo=/catalog');
          }
        }, 2000);
        return;
      }

      // Loading complete, check session
      setAuthChecking(true);
      console.log('[Catalog] Loading complete, checking Supabase session');

      const maxAttempts = 3;
      for (let attempt = 1; attempt <= maxAttempts && !cancelled && !hasRedirected; attempt++) {
        const { data: { session } } = await supabase.auth.getSession();
        const hasSessionUser = !!session?.user;
        console.log(`[Catalog] Session poll attempt ${attempt}`, { hasSession: hasSessionUser });

        if (hasSessionUser) {
          console.log('[Catalog] Session detected, waiting for AuthProvider to update user');
          setAuthChecking(false);
          // Wait a moment for AuthProvider to update, then re-check
          setTimeout(() => {
            if (!cancelled && !user) {
              // Still no user after session found, might be timing issue
              console.log('[Catalog] Session found but user not set yet - will re-check on next render');
            }
          }, 500);
          return;
        }

        await new Promise((resolve) => setTimeout(resolve, 200));
      }

      if (!cancelled && !hasRedirected) {
        console.log('[Catalog] No session found after retries - redirecting to login');
        setHasRedirected(true);
        setAuthChecking(false);
        router.push('/auth/login?redirectTo=/catalog');
      }
    };

    verifySessionBeforeRedirect();

    return () => {
      cancelled = true;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [user, loading, router, hasRedirected]);

  const handleSelectBook = (book: UnifiedBook) => {
    // Phase 8: Unified routing - handle both Featured Books and Enhanced Books
    // Enhanced books (gutenberg-*) have bundles=0 and sentences=0, use chunk-based system
    const isEnhancedBookType = (book.bundles === 0 && book.sentences === 0) || 
                               (book.slug?.startsWith('gutenberg-') && (!book.bundles || book.bundles === 0)) ||
                               isEnhancedBook(book);
    
    if (isEnhancedBookType) {
      // Enhanced Books (chunk architecture) → /library/[id]/read
      // Use slug as bookId for enhanced books (gutenberg-*)
      const bookId = book.slug || book.id;
      router.push(`/library/${bookId}/read`);
    } else if (isFeaturedBook(book) && book.slug && book.bundles && book.bundles > 0) {
      // Featured Books (bundle architecture) → /read/[slug]
      router.push(`/read/${book.slug}`);
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
