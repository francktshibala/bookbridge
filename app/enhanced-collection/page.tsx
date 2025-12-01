/**
 * Enhanced Collection Page - Redirect to Catalog
 * 
 * Phase 8: Catalog Unification Complete
 * Enhanced Books are now merged into the unified catalog at /catalog
 * All Enhanced Books appear in the catalog with ✨ Enhanced badge
 * 
 * Legacy: This page has been replaced by the unified catalog
 */

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function EnhancedCollectionPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to unified catalog
    router.replace('/catalog');
  }, [router]);

  // Show loading state during redirect
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{ borderColor: 'var(--accent-primary)' }}></div>
        <p style={{ fontFamily: '"Source Serif Pro", Georgia, serif', color: 'var(--text-secondary)' }}>
          Redirecting to Library...
        </p>
      </div>
    </div>
  );
}
