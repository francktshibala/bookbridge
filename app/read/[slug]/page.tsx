/**
 * Unified Reading Route - Bundle Books
 * 
 * This route handles reading for bundle-architecture books (FeaturedBooks)
 * Example: /read/always-a-family
 * Example: /read/the-necklace?level=A1
 * 
 * Phase 3: Route Creation
 */

'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { BundleReadingInterface } from '@/components/reading/BundleReadingInterface';

function ReadPageContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  
  const bookSlug = params.slug as string;
  const level = searchParams.get('level') || undefined; // Optional level from URL
  
  return <BundleReadingInterface bookSlug={bookSlug} defaultLevel={level} />;
}

export default function ReadPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--accent-primary)] mx-auto mb-4"></div>
          <p className="text-[var(--text-secondary)]" style={{ fontFamily: '"Source Serif Pro", Georgia, serif' }}>
            Loading reading experience...
          </p>
        </div>
      </div>
    }>
      <ReadPageContent />
    </Suspense>
  );
}

