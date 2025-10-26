/**
 * useAutoResume Hook
 * Handles Netflix-style auto-resume for featured books
 * Phase 2, Task 2.3: LocalStorage-only implementation
 */

'use client';

import { useEffect, useState } from 'react';
import { getLastBookId } from '@/lib/utils/auto-resume-storage';

export interface AutoResumeResult {
  shouldAutoResume: boolean;
  bookId: string | null;
  isLoading: boolean;
}

/**
 * Hook to determine if auto-resume should occur
 * Returns bookId from localStorage if feature is enabled
 */
export function useAutoResume(): AutoResumeResult {
  const [result, setResult] = useState<AutoResumeResult>({
    shouldAutoResume: false,
    bookId: null,
    isLoading: true
  });

  useEffect(() => {
    // SSR/hydration guard: only run on client-side
    if (typeof window === 'undefined') {
      setResult({
        shouldAutoResume: false,
        bookId: null,
        isLoading: false
      });
      return;
    }

    // Feature flag check
    if (process.env.NEXT_PUBLIC_ENABLE_AUTO_RESUME !== 'true') {
      console.log('🚫 [Auto-Resume] Feature disabled by flag');
      setResult({
        shouldAutoResume: false,
        bookId: null,
        isLoading: false
      });
      return;
    }

    // Get last book ID from localStorage
    const lastBookId = getLastBookId();

    if (!lastBookId) {
      console.log('📚 [Auto-Resume] No saved book ID found');
      setResult({
        shouldAutoResume: false,
        bookId: null,
        isLoading: false
      });
      return;
    }

    // Return bookId - caller will validate if it exists in their book list
    console.log('✅ [Auto-Resume] Found last book ID:', lastBookId);
    setResult({
      shouldAutoResume: true,
      bookId: lastBookId,
      isLoading: false
    });

  }, []); // Run once on mount

  return result;
}
