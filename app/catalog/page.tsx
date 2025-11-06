/**
 * Catalog Page
 * Book discovery and browsing interface
 * Phase 6: Integration of all catalog components
 * References: BOOK_ORGANIZATION_SCHEMES.md
 */

'use client';

import { Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { CatalogProvider } from '@/contexts/CatalogContext';
import { CatalogBrowser } from '@/components/catalog/CatalogBrowser';
import type { FeaturedBook } from '@prisma/client';

function CatalogContent() {
  const router = useRouter();

  const handleSelectBook = (book: FeaturedBook) => {
    // Navigate to the reading interface with the selected book
    router.push(`/featured-books?book=${book.slug}`);
  };

  const handleAskAI = (book: FeaturedBook) => {
    // TODO: Implement AI chat modal for books
    console.log('Ask AI about:', book.title);
  };

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
