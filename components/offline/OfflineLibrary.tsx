'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useOffline } from '@/contexts/OfflineContext';
import { Trash2, Book, HardDrive, WifiOff } from 'lucide-react';
import type { OfflineBook } from '@/lib/offline/indexeddb';

export function OfflineLibrary() {
  const router = useRouter();
  const {
    downloadedBooks,
    refreshDownloadedBooks,
    deleteBook,
    storageUsed,
    storageFormatted,
    refreshStorage,
    isOnline,
  } = useOffline();

  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    refreshDownloadedBooks();
    refreshStorage();
  }, [refreshDownloadedBooks, refreshStorage]);

  const handleDelete = async (bookId: string) => {
    if (!confirm('Delete this book from offline storage?')) {
      return;
    }

    try {
      setDeleting(bookId);
      await deleteBook(bookId);
    } catch (error) {
      console.error('Failed to delete book:', error);
      alert('Failed to delete book');
    } finally {
      setDeleting(null);
    }
  };

  const handleOpenBook = (bookId: string) => {
    router.push(`/featured-books?book=${bookId}`);
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Offline Library
          </h1>
          {!isOnline && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 rounded-full text-sm">
              <WifiOff className="w-4 h-4" />
              <span>Offline Mode</span>
            </div>
          )}
        </div>
        <p className="text-gray-600 dark:text-gray-400">
          Books available for reading without internet connection
        </p>
      </div>

      {/* Storage Info */}
      <div className="mb-6 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <HardDrive className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Storage Used</div>
              <div className="text-lg font-semibold text-gray-900 dark:text-white">
                {storageFormatted}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-600 dark:text-gray-400">Downloaded Books</div>
            <div className="text-lg font-semibold text-gray-900 dark:text-white">
              {downloadedBooks.length}
            </div>
          </div>
        </div>
      </div>

      {/* Books List */}
      {downloadedBooks.length === 0 ? (
        <div className="text-center py-12">
          <Book className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No offline books yet
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Download books to read without internet connection
          </p>
          <button
            onClick={() => router.push('/featured-books')}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            Browse Books
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {downloadedBooks.map((book) => (
            <div
              key={book.id}
              className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-4">
                <div
                  className="flex-1 cursor-pointer"
                  onClick={() => handleOpenBook(book.id)}
                >
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                    {book.title}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    {book.author}
                  </p>
                  <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                    <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded">
                      {book.level}
                    </span>
                    <span>{book.metadata.totalBundles} bundles</span>
                    <span>{book.metadata.totalSentences} sentences</span>
                    <span>{formatSize(book.totalSize)}</span>
                    <span>Downloaded {formatDate(book.downloadedAt)}</span>
                  </div>
                </div>

                <button
                  onClick={() => handleDelete(book.id)}
                  disabled={deleting === book.id}
                  className="p-2 hover:bg-red-100 dark:hover:bg-red-900 text-red-600 dark:text-red-400 rounded-lg transition-colors disabled:opacity-50"
                  title="Delete from offline storage"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
