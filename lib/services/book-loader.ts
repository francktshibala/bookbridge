/**
 * Book Loader Service
 *
 * Pure data fetching function for loading book bundles.
 * Extracted from AudioContext as part of Phase 4 refactor.
 *
 * Architecture:
 * - Pure function (no state, no side effects)
 * - Accepts AbortSignal for cancellation
 * - Returns typed Promise<RealBundleApiResponse>
 * - No React dependencies
 *
 * @module lib/services/book-loader
 */

import { type CEFRLevel, type ContentMode, type RealBundleApiResponse, type BundleData, type BundleSentence } from '@/contexts/AudioContext';
import { FEATURED_BOOKS, getBookApiEndpoint } from '@/lib/config/books';

/**
 * Load book bundles from API
 *
 * Handles both original and simplified content modes:
 * - Original: Fetches from /api/books/[id]/content and transforms to bundle format
 * - Simplified: Fetches from book-specific bundle API endpoint
 *
 * @param bookId - Book identifier (e.g., 'great-gatsby-a2')
 * @param level - CEFR level or 'original' ('A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2' | 'original')
 * @param mode - Content mode ('original' | 'simplified')
 * @param signal - AbortSignal for request cancellation
 * @returns Promise<RealBundleApiResponse> - Book bundle data with sentences and audio URLs
 * @throws Error if fetch fails or returns invalid data
 */
export async function loadBookBundles(
  bookId: string,
  level: CEFRLevel | 'original',
  mode: ContentMode,
  signal: AbortSignal
): Promise<RealBundleApiResponse> {

  // Handle original content mode
  if (mode === 'original') {
    // Fetch original text from book content API
    const contentResponse = await fetch(`/api/books/${bookId}/content`, {
      next: {
        revalidate: 3600, // Cache for 1 hour
        tags: [`book-${bookId}`, 'original-content']
      },
      signal
    });

    if (!contentResponse.ok) {
      throw new Error(`Failed to fetch original content: ${contentResponse.status} ${contentResponse.statusText}`);
    }

    const contentData = await contentResponse.json();

    // Find the book info
    const bookInfo = FEATURED_BOOKS.find(b => b.id === bookId);

    // Transform original content to bundle format
    // WARNING: This uses text-splitting fallback which breaks on Mr./Dr./etc.
    const sentences = contentData.content
      .split(/[.!?]+/)
      .filter((s: string) => s.trim().length > 0);

    const sentencesPerBundle = 4;
    const bundles: BundleData[] = [];

    for (let i = 0; i < sentences.length; i += sentencesPerBundle) {
      const bundleSentences: BundleSentence[] = [];
      const bundleTexts = sentences.slice(i, Math.min(i + sentencesPerBundle, sentences.length));

      bundleTexts.forEach((text: string, index: number) => {
        const cleanText = text.trim();
        if (cleanText) {
          bundleSentences.push({
            sentenceId: `original-${i + index}`,
            sentenceIndex: i + index,
            text: cleanText + (cleanText.match(/[.!?]$/) ? '' : '.'),
            startTime: index * 2,
            endTime: (index + 1) * 2,
            wordTimings: []
          });
        }
      });

      if (bundleSentences.length > 0) {
        bundles.push({
          bundleId: `original-bundle-${bundles.length}`,
          bundleIndex: bundles.length,
          audioUrl: '', // No audio for original text
          totalDuration: bundleSentences.length * 2,
          sentences: bundleSentences
        });
      }
    }

    return {
      success: true,
      bookId: bookId,
      title: contentData.title || bookInfo?.title || 'Book',
      author: contentData.author || bookInfo?.author || 'Author',
      level: 'original',
      bundleCount: bundles.length,
      totalSentences: sentences.length,
      bundles: bundles,
      audioType: 'none'
    };
  }

  // Handle simplified content mode
  // Use dynamic API endpoint detection
  const apiEndpoint = getBookApiEndpoint(bookId, level);
  // Progressive loading: request only the first page initially
  const initialLimit = 10;
  const apiUrl = `${apiEndpoint}?bookId=${bookId}&level=${level}&limit=${initialLimit}&offset=0`;

  const response = await fetch(apiUrl, {
    next: {
      revalidate: 3600, // Cache for 1 hour
      tags: [`book-${bookId}`, `level-${level}`, 'bundle-data']
    },
    signal
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch book data: ${response.status} ${response.statusText}`);
  }

  const raw = await response.json();
  const data: RealBundleApiResponse = {
    ...raw,
    bundleCount: typeof raw.bundleCount === 'number' ? raw.bundleCount : (typeof raw.totalBundles === 'number' ? raw.totalBundles : (Array.isArray(raw.bundles) ? raw.bundles.length : 0))
  };

  // Validate response
  if (!data || !data.success || data.totalSentences === 0 || typeof data.bundleCount !== 'number') {
    throw new Error('Invalid book data received from API');
  }

  return data;
}
