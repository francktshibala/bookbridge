/**
 * Book Grid Component
 * Displays book cards in responsive grid with cursor pagination
 * Follows Phase 3 component extraction pattern + Neo-Classic design system
 * References: NEO_CLASSIC_TRANSFORMATION_PLAN.md Phase 4 & 7 (Book cards)
 */

'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import type { UnifiedBook } from '@/types/unified-book';
import { isFeaturedBook, isEnhancedBook } from '@/types/unified-book';

interface BookGridProps {
  books: UnifiedBook[];
  loading?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  onSelectBook: (book: UnifiedBook) => void;
  onAskAI?: (book: UnifiedBook) => void;
  emptyMessage?: string;
}

export function BookGrid({
  books,
  loading = false,
  hasMore = false,
  onLoadMore,
  onSelectBook,
  onAskAI,
  emptyMessage = 'No books found'
}: BookGridProps) {
  if (loading && books.length === 0) {
    return <BookGridSkeleton />;
  }

  if (books.length === 0) {
    return <EmptyState message={emptyMessage} />;
  }

  return (
    <div className="space-y-8">
      {/* Book Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 max-w-5xl mx-auto px-4">
        {books.map((book, index) => (
          <BookCard
            key={book.id}
            book={book}
            index={index}
            onSelectBook={onSelectBook}
            onAskAI={onAskAI}
          />
        ))}
      </div>

      {/* Load More Button */}
      {hasMore && onLoadMore && (
        <div className="flex justify-center pt-4">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onLoadMore}
            disabled={loading}
            className="px-8 py-3 rounded-lg font-semibold transition-all"
            style={{
              fontFamily: '"Source Serif Pro", Georgia, serif',
              background: 'var(--accent-primary)',
              color: 'var(--bg-primary)',
              boxShadow: '0 4px 16px var(--shadow-soft)',
              opacity: loading ? 0.6 : 1
            }}
          >
            {loading ? 'Loading...' : 'Load More Books'}
          </motion.button>
        </div>
      )}
    </div>
  );
}

// Book Card Component

function BookCard({
  book,
  index,
  onSelectBook,
  onAskAI
}: {
  book: UnifiedBook;
  index: number;
  onSelectBook: (book: UnifiedBook) => void;
  onAskAI?: (book: UnifiedBook) => void;
}) {
  // Format reading time
  const formatReadingTime = (minutes: number) => {
    if (minutes >= 60) {
      const hours = (minutes / 60).toFixed(1);
      return `~${hours}h`;
    }
    return `~${minutes}m`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="group cursor-pointer"
      onClick={() => onSelectBook(book)}
    >
      <div
        className="bg-[var(--bg-secondary)] border-2 border-[var(--accent-primary)]/30 rounded-lg shadow-md hover:shadow-xl transition-all duration-300 hover:border-[var(--accent-primary)]/60 hover:-translate-y-1 p-5 h-48 flex flex-col justify-between"
      >
        {/* Card Content */}
        <div>
          {/* Book Title */}
          <div
            className="text-lg font-bold text-[var(--text-accent)] mb-1 leading-tight"
            style={{ fontFamily: 'Playfair Display, serif' }}
          >
            {book.title}
          </div>

          {/* Author */}
          <div
            className="text-sm text-[var(--text-secondary)] mb-3"
            style={{ fontFamily: 'Source Serif Pro, serif' }}
          >
            by {book.author}
          </div>

          {/* Meta Tags - Compact Style */}
          <div className="flex gap-2 mb-3 flex-wrap">
            {/* Architecture Badge */}
            {isEnhancedBook(book) && (
              <span className="px-2 py-1 bg-purple-100 text-purple-700 border border-purple-300 rounded-full text-xs font-medium">
                ✨ Enhanced
              </span>
            )}
            {isFeaturedBook(book) && (
              <span className="px-2 py-1 bg-blue-100 text-blue-700 border border-blue-300 rounded-full text-xs font-medium">
                🎧 Audio
              </span>
            )}
            {/* CEFR Levels */}
            {isFeaturedBook(book) ? (
              <span className="px-2 py-1 bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] border border-[var(--accent-primary)]/30 rounded-full text-xs font-medium">
                A1-C2
              </span>
            ) : book.cefrLevels ? (
              <span className="px-2 py-1 bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] border border-[var(--accent-primary)]/30 rounded-full text-xs font-medium">
                {book.cefrLevels}
              </span>
            ) : null}
            {/* Classic Badge (Featured Books only) */}
            {isFeaturedBook(book) && (book as any).isClassic && (
              <span className="px-2 py-1 bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] border border-[var(--accent-primary)]/30 rounded-full text-xs font-medium">
                Classic
              </span>
            )}
            {/* Reading Time */}
            {isFeaturedBook(book) && (book as any).readingTimeMinutes > 0 ? (
              <span className="px-2 py-1 bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] border border-[var(--accent-primary)]/30 rounded-full text-xs font-medium">
                {formatReadingTime((book as any).readingTimeMinutes)}
              </span>
            ) : isEnhancedBook(book) && book.estimatedHours ? (
              <span className="px-2 py-1 bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] border border-[var(--accent-primary)]/30 rounded-full text-xs font-medium">
                ~{book.estimatedHours}h
              </span>
            ) : null}
          </div>

          {/* Action Buttons - Compact Style */}
          <div className="flex gap-2 mt-auto">
            {onAskAI && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onAskAI(book);
                }}
                className="flex-1 h-9 rounded-lg bg-transparent text-[var(--accent-primary)] border border-[var(--accent-primary)]/30 hover:bg-[var(--accent-primary)]/10 hover:border-[var(--accent-primary)]/60 transition-all duration-200 text-sm font-medium"
                style={{ fontFamily: 'Source Serif Pro, serif' }}
              >
                Ask AI
              </button>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSelectBook(book);
              }}
              className="flex-1 h-9 bg-[var(--accent-primary)] text-[var(--bg-primary)] hover:bg-[var(--accent-secondary)] rounded-lg text-sm font-semibold transition-all duration-200 shadow-md hover:shadow-lg"
              style={{ fontFamily: 'Source Serif Pro, serif' }}
            >
              Start Reading
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// Loading Skeleton

function BookGridSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {Array.from({ length: 8 }).map((_, index) => (
        <div
          key={index}
          className="animate-pulse"
          style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-light)',
            borderRadius: '12px',
            padding: '1.5rem'
          }}
        >
          {/* Cover skeleton */}
          <div
            className="w-full aspect-[3/4] rounded-lg mb-4"
            style={{ background: 'var(--border-light)' }}
          />

          {/* Title skeleton */}
          <div
            className="h-5 w-3/4 mb-2 rounded"
            style={{ background: 'var(--border-light)' }}
          />

          {/* Author skeleton */}
          <div
            className="h-4 w-1/2 mb-3 rounded"
            style={{ background: 'var(--border-light)' }}
          />

          {/* Description skeleton */}
          <div
            className="h-3 w-full mb-1 rounded"
            style={{ background: 'var(--border-light)' }}
          />
          <div
            className="h-3 w-5/6 rounded"
            style={{ background: 'var(--border-light)' }}
          />
        </div>
      ))}
    </div>
  );
}

// Empty State

function EmptyState({ message }: { message: string }) {
  return (
    <div
      className="flex flex-col items-center justify-center py-16 px-4 rounded-lg"
      style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-light)'
      }}
    >
      <svg
        className="w-16 h-16 mb-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        style={{ color: 'var(--text-tertiary)' }}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
        />
      </svg>

      <p
        className="text-lg font-semibold mb-2"
        style={{
          fontFamily: '"Playfair Display", Georgia, serif',
          color: 'var(--text-secondary)'
        }}
      >
        {message}
      </p>

      <p
        className="text-sm text-center max-w-md"
        style={{
          fontFamily: '"Source Serif Pro", Georgia, serif',
          color: 'var(--text-tertiary)'
        }}
      >
        Try adjusting your filters or search query to find more books.
      </p>
    </div>
  );
}
