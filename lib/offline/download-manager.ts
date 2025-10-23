/**
 * Download Manager
 * Handles downloading books and audio bundles for offline use
 */

import { offlineDB, type OfflineBook, type OfflineBundle, type DownloadProgress } from './indexeddb';

export interface BookDownloadRequest {
  bookId: string;
  level: string;
}

export interface DownloadOptions {
  onProgress?: (progress: DownloadProgress) => void;
  onBundleDownloaded?: (bundleIndex: number, totalBundles: number) => void;
  onComplete?: (bookId: string) => void;
  onError?: (error: Error) => void;
  signal?: AbortSignal; // For cancellation
}

class DownloadManager {
  private activeDownloads = new Map<string, AbortController>();
  private progressCallbacks = new Map<string, (progress: DownloadProgress) => void>();

  /**
   * Download a book for offline use
   */
  async downloadBook(
    request: BookDownloadRequest,
    options: DownloadOptions = {}
  ): Promise<void> {
    const { bookId, level } = request;
    const { onProgress, onBundleDownloaded, onComplete, onError, signal } = options;

    // Check if already downloading
    if (this.activeDownloads.has(bookId)) {
      throw new Error(`Book ${bookId} is already being downloaded`);
    }

    // Create abort controller
    const abortController = new AbortController();
    this.activeDownloads.set(bookId, abortController);

    // Register progress callback
    if (onProgress) {
      this.progressCallbacks.set(bookId, onProgress);
    }

    // Listen to external abort signal
    if (signal) {
      signal.addEventListener('abort', () => {
        this.cancelDownload(bookId);
      });
    }

    try {
      console.log(`📥 Starting download for ${bookId} (${level})`);

      // Step 1: Fetch book metadata from API
      const apiUrl = `/api/${bookId}-${level.toLowerCase()}/bundles?bookId=${bookId}&level=${level}`;
      const response = await fetch(apiUrl, { signal: abortController.signal });

      if (!response.ok) {
        throw new Error(`Failed to fetch book data: ${response.statusText}`);
      }

      const bookData = await response.json();

      if (!bookData.success) {
        throw new Error(bookData.error || 'Failed to fetch book data');
      }

      const { book, bundles, chapters, totalSentences, totalBundles } = bookData;

      // Initialize progress
      const progress: DownloadProgress = {
        bookId,
        bundleIndex: 0,
        totalBundles: bundles.length,
        downloaded: 0,
        failed: 0,
        status: 'downloading',
        bytesDownloaded: 0,
        totalBytes: 0, // We'll estimate this
      };

      await offlineDB.saveProgress(progress);
      this.notifyProgress(bookId, progress);

      // Step 2: Save book metadata
      const offlineBook: Omit<OfflineBook, 'bundles'> = {
        id: bookId,
        title: book.title,
        author: book.author,
        level,
        downloadedAt: new Date(),
        lastAccessedAt: new Date(),
        totalSize: 0, // Will be calculated as we download
        metadata: {
          totalBundles: bundles.length,
          totalSentences,
          chapters,
        },
      };

      await offlineDB.saveBookMetadata(offlineBook);

      // Step 3: Download each bundle's audio file
      let totalSize = 0;

      for (let i = 0; i < bundles.length; i++) {
        // Check if cancelled
        if (abortController.signal.aborted) {
          throw new Error('Download cancelled');
        }

        const bundle = bundles[i];

        try {
          console.log(`📦 Downloading bundle ${i + 1}/${bundles.length}: ${bundle.audioUrl}`);

          // Fetch audio file
          const audioResponse = await fetch(bundle.audioUrl, {
            signal: abortController.signal,
          });

          if (!audioResponse.ok) {
            throw new Error(`Failed to fetch audio: ${audioResponse.statusText}`);
          }

          const audioBlob = await audioResponse.blob();
          const bundleSize = audioBlob.size;
          totalSize += bundleSize;

          // Save bundle to IndexedDB
          const offlineBundle: OfflineBundle = {
            bundleId: bundle.bundleId,
            bundleIndex: bundle.bundleIndex,
            audioBlob,
            audioUrl: bundle.audioUrl,
            totalDuration: bundle.totalDuration,
            sentences: bundle.sentences,
          };

          await offlineDB.saveBundle(bookId, offlineBundle);

          // Update progress
          progress.bundleIndex = i + 1;
          progress.downloaded = i + 1;
          progress.bytesDownloaded = totalSize;
          progress.totalBytes = Math.ceil(totalSize / (i + 1) * bundles.length); // Estimate

          await offlineDB.saveProgress(progress);
          this.notifyProgress(bookId, progress);

          if (onBundleDownloaded) {
            onBundleDownloaded(i + 1, bundles.length);
          }

        } catch (error) {
          console.error(`Failed to download bundle ${i}:`, error);
          progress.failed++;
          await offlineDB.saveProgress(progress);
          this.notifyProgress(bookId, progress);

          // Continue with next bundle instead of failing completely
          if (error instanceof Error && error.name === 'AbortError') {
            throw error; // Propagate abort
          }
        }
      }

      // Step 4: Update final book metadata with total size
      offlineBook.totalSize = totalSize;
      await offlineDB.saveBookMetadata(offlineBook);

      // Step 5: Mark as complete
      progress.status = 'completed';
      progress.bytesDownloaded = totalSize;
      progress.totalBytes = totalSize;
      await offlineDB.saveProgress(progress);
      this.notifyProgress(bookId, progress);

      // Clean up
      this.activeDownloads.delete(bookId);
      this.progressCallbacks.delete(bookId);

      console.log(`✅ Download complete: ${bookId} (${this.formatBytes(totalSize)})`);

      if (onComplete) {
        onComplete(bookId);
      }

    } catch (error) {
      console.error(`Download failed for ${bookId}:`, error);

      // Update progress to failed
      const progress = await offlineDB.getProgress(bookId);
      if (progress) {
        progress.status = 'failed';
        progress.error = error instanceof Error ? error.message : 'Unknown error';
        await offlineDB.saveProgress(progress);
        this.notifyProgress(bookId, progress);
      }

      // Clean up
      this.activeDownloads.delete(bookId);
      this.progressCallbacks.delete(bookId);

      if (onError) {
        onError(error instanceof Error ? error : new Error('Unknown error'));
      }

      throw error;
    }
  }

  /**
   * Cancel an active download
   */
  cancelDownload(bookId: string): void {
    const controller = this.activeDownloads.get(bookId);
    if (controller) {
      controller.abort();
      this.activeDownloads.delete(bookId);
      this.progressCallbacks.delete(bookId);
      console.log(`❌ Download cancelled: ${bookId}`);
    }
  }

  /**
   * Pause a download (save progress and cancel)
   */
  async pauseDownload(bookId: string): Promise<void> {
    const progress = await offlineDB.getProgress(bookId);
    if (progress) {
      progress.status = 'paused';
      await offlineDB.saveProgress(progress);
      this.notifyProgress(bookId, progress);
    }
    this.cancelDownload(bookId);
  }

  /**
   * Resume a paused download
   */
  async resumeDownload(
    bookId: string,
    level: string,
    options: DownloadOptions = {}
  ): Promise<void> {
    const progress = await offlineDB.getProgress(bookId);
    if (!progress || progress.status !== 'paused') {
      throw new Error('No paused download found for this book');
    }

    // Resume from where we left off
    await this.downloadBook({ bookId, level }, options);
  }

  /**
   * Check if a book is currently being downloaded
   */
  isDownloading(bookId: string): boolean {
    return this.activeDownloads.has(bookId);
  }

  /**
   * Get download progress for a book
   */
  async getProgress(bookId: string): Promise<DownloadProgress | null> {
    return offlineDB.getProgress(bookId);
  }

  /**
   * Delete a downloaded book
   */
  async deleteBook(bookId: string): Promise<void> {
    // Cancel if currently downloading
    if (this.isDownloading(bookId)) {
      this.cancelDownload(bookId);
    }

    await offlineDB.deleteBook(bookId);
    console.log(`🗑️ Deleted offline book: ${bookId}`);
  }

  /**
   * Get all downloaded books
   */
  async getDownloadedBooks(): Promise<OfflineBook[]> {
    return offlineDB.getDownloadedBooks();
  }

  /**
   * Check if a book is available offline
   */
  async isBookAvailableOffline(bookId: string): Promise<boolean> {
    return offlineDB.isBookDownloaded(bookId);
  }

  /**
   * Get total storage used by offline books
   */
  async getStorageUsed(): Promise<{ bytes: number; formatted: string }> {
    const bytes = await offlineDB.getStorageSize();
    return {
      bytes,
      formatted: this.formatBytes(bytes),
    };
  }

  /**
   * Notify progress callback
   */
  private notifyProgress(bookId: string, progress: DownloadProgress): void {
    const callback = this.progressCallbacks.get(bookId);
    if (callback) {
      callback(progress);
    }
  }

  /**
   * Format bytes to human-readable string
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Estimate download size before downloading
   */
  async estimateDownloadSize(bookId: string, level: string): Promise<number> {
    try {
      // Fetch metadata without downloading audio
      const apiUrl = `/api/${bookId}-${level.toLowerCase()}/bundles?bookId=${bookId}&level=${level}`;
      const response = await fetch(apiUrl);
      const data = await response.json();

      if (data.success) {
        // Estimate: average 50KB per bundle (can be refined)
        const estimatedBytesPerBundle = 50000;
        return data.totalBundles * estimatedBytesPerBundle;
      }

      return 0;
    } catch (error) {
      console.error('Failed to estimate download size:', error);
      return 0;
    }
  }
}

// Singleton instance
export const downloadManager = new DownloadManager();
