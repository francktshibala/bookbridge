/**
 * Offline Audio Provider
 * Provides audio from IndexedDB when offline or falls back to network
 */

import { offlineDB } from './indexeddb';
import type { BundleData } from '../audio/BundleAudioManager';

export class OfflineAudioProvider {
  private blobUrlCache = new Map<string, string>();

  /**
   * Get bundle data with audio, either from IndexedDB or network
   */
  async getBundle(
    bookId: string,
    bundleIndex: number,
    fallbackUrl?: string
  ): Promise<BundleData | null> {
    try {
      // First, try to get from IndexedDB
      const offlineBundle = await offlineDB.getBundle(bookId, bundleIndex);

      if (offlineBundle) {
        console.log(`📦 Loading bundle ${bundleIndex} from offline storage`);

        // Create blob URL for audio
        const blobUrl = this.createBlobUrl(
          bookId,
          bundleIndex,
          offlineBundle.audioBlob
        );

        // Convert to BundleData format
        const bundleData: BundleData = {
          bundleId: offlineBundle.bundleId,
          bundleIndex: offlineBundle.bundleIndex,
          audioUrl: blobUrl,
          totalDuration: offlineBundle.totalDuration,
          sentences: offlineBundle.sentences.map(s => ({
            ...s,
            wordTimings: s.wordTimings || []
          }))
        };

        return bundleData;
      }

      // If not in IndexedDB and we have a fallback URL, use network
      if (fallbackUrl) {
        console.log(`🌐 Bundle ${bundleIndex} not available offline, using network`);
        return null; // Caller should handle network fetch
      }

      return null;

    } catch (error) {
      console.error('Failed to get bundle:', error);
      return null;
    }
  }

  /**
   * Get all bundles for a book (for preloading)
   */
  async getAllBundles(bookId: string): Promise<BundleData[]> {
    try {
      const offlineBundles = await offlineDB.getBookBundles(bookId);

      return offlineBundles.map(bundle => {
        const blobUrl = this.createBlobUrl(bookId, bundle.bundleIndex, bundle.audioBlob);

        return {
          bundleId: bundle.bundleId,
          bundleIndex: bundle.bundleIndex,
          audioUrl: blobUrl,
          totalDuration: bundle.totalDuration,
          sentences: bundle.sentences.map(s => ({
            ...s,
            wordTimings: s.wordTimings || []
          }))
        };
      });
    } catch (error) {
      console.error('Failed to get all bundles:', error);
      return [];
    }
  }

  /**
   * Check if bundles are available offline
   */
  async areBundlesAvailableOffline(bookId: string): Promise<boolean> {
    return offlineDB.isBookDownloaded(bookId);
  }

  /**
   * Create a blob URL from audio blob
   */
  private createBlobUrl(bookId: string, bundleIndex: number, blob: Blob): string {
    const key = `${bookId}-${bundleIndex}`;

    // Reuse existing blob URL if available
    if (this.blobUrlCache.has(key)) {
      return this.blobUrlCache.get(key)!;
    }

    // Create new blob URL
    const blobUrl = URL.createObjectURL(blob);
    this.blobUrlCache.set(key, blobUrl);

    return blobUrl;
  }

  /**
   * Clean up blob URLs to free memory
   */
  revokeBlobUrls(bookId?: string): void {
    if (bookId) {
      // Revoke URLs for specific book
      for (const [key, url] of this.blobUrlCache.entries()) {
        if (key.startsWith(bookId)) {
          URL.revokeObjectURL(url);
          this.blobUrlCache.delete(key);
        }
      }
    } else {
      // Revoke all blob URLs
      for (const url of this.blobUrlCache.values()) {
        URL.revokeObjectURL(url);
      }
      this.blobUrlCache.clear();
    }
  }

  /**
   * Preload bundles for smoother playback
   */
  async preloadBundles(bookId: string, startIndex: number, count: number = 3): Promise<void> {
    const tasks = [];
    for (let i = startIndex; i < startIndex + count; i++) {
      tasks.push(this.getBundle(bookId, i));
    }
    await Promise.all(tasks);
  }
}

// Singleton instance
export const offlineAudioProvider = new OfflineAudioProvider();
