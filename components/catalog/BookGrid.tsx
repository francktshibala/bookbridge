/**
 * Book Grid Component
 * Displays book cards in responsive grid with cursor pagination
 * Follows Phase 3 component extraction pattern + Neo-Classic design system
 * References: NEO_CLASSIC_TRANSFORMATION_PLAN.md Phase 4 & 7 (Book cards)
 */

'use client';

import { motion } from 'framer-motion';
import { useMemo } from 'react';
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
      {/* Book Grid - CSS Grid with equal heights */}
      <div 
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto px-4"
        style={{ gridAutoRows: 'minmax(240px, auto)' }}
      >
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
  // Format reading time helper
  const formatReadingTime = (minutes: number) => {
    if (minutes >= 60) {
      const hours = (minutes / 60).toFixed(1);
      return `~${hours}h`;
    }
    return `~${minutes}m`;
  };

  // Badge priority system - limit to 4 most important badges
  const badges = useMemo(() => {
    const allBadges: Array<{ label: string; priority: number; color: 'purple' | 'blue' | 'accent' }> = [];
    
    // Priority 1: Architecture badges (most important)
    if (isEnhancedBook(book)) {
      allBadges.push({ label: '✨ Enhanced', priority: 1, color: 'purple' });
    }
    if (isFeaturedBook(book)) {
      allBadges.push({ label: '🎧 Audio', priority: 1, color: 'blue' });
    }
    
    // Priority 2: CEFR levels
    if (isFeaturedBook(book)) {
      allBadges.push({ label: 'A1-C2', priority: 2, color: 'accent' });
    } else if (book.cefrLevels) {
      allBadges.push({ label: book.cefrLevels, priority: 2, color: 'accent' });
    }
    
    // Priority 3: Reading time
    if (isFeaturedBook(book) && (book as any).readingTimeMinutes > 0) {
      const readingTime = formatReadingTime((book as any).readingTimeMinutes);
      allBadges.push({ label: readingTime, priority: 3, color: 'accent' });
    } else if (isEnhancedBook(book) && book.estimatedHours) {
      allBadges.push({ label: `~${book.estimatedHours}h`, priority: 3, color: 'accent' });
    }
    
    // Priority 4: Classic badge (if exists)
    if (isFeaturedBook(book) && (book as any).isClassic) {
      allBadges.push({ label: 'Classic', priority: 4, color: 'accent' });
    }
    
    // Sort by priority and limit to 4
    return allBadges.sort((a, b) => a.priority - b.priority).slice(0, 4);
  }, [book]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="group cursor-pointer h-full"
      onClick={() => onSelectBook(book)}
    >
      <div
        className="h-full flex flex-col bg-[var(--bg-secondary)] border-2 border-[var(--accent-primary)]/30 rounded-lg shadow-md hover:shadow-xl transition-all duration-300 hover:border-[var(--accent-primary)]/60 hover:-translate-y-1 p-5"
        style={{ minHeight: '240px' }}
      >
        {/* Book Title - Truncate after 2 lines */}
        <div
          className="text-lg font-bold text-[var(--text-accent)] mb-1 leading-tight line-clamp-2"
          style={{ fontFamily: 'Playfair Display, serif' }}
          title={book.title}
        >
          {book.title}
        </div>

        {/* Author - Single line with truncation */}
        <div
          className="text-sm text-[var(--text-secondary)] mb-3 truncate"
          style={{ fontFamily: 'Source Serif Pro, serif' }}
          title={`by ${book.author}`}
        >
          by {book.author}
        </div>

        {/* Meta Tags - Fixed height container, max 2 rows */}
        <div className="flex gap-2 mb-3 flex-wrap min-h-[32px] max-h-[64px] overflow-hidden">
          {badges.map((badge, idx) => (
            <span
              key={idx}
              className={`px-2 py-1 rounded-full text-xs font-medium ${
                badge.color === 'purple'
                  ? 'bg-purple-100 text-purple-700 border border-purple-300'
                  : badge.color === 'blue'
                  ? 'bg-blue-100 text-blue-700 border border-blue-300'
                  : 'bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] border border-[var(--accent-primary)]/30'
              }`}
            >
              {badge.label}
            </span>
          ))}
        </div>

        {/* Action Buttons - Always at bottom via mt-auto */}
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
    </motion.div>
  );
}

// Loading Skeleton - Matches actual book card dimensions

function BookGridSkeleton() {
  return (
    <div 
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto px-4"
      style={{ gridAutoRows: 'minmax(240px, auto)' }}
    >
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={index}
          style={{
            background: 'var(--bg-secondary)',
            border: '2px solid var(--accent-primary)/30',
            borderRadius: '0.5rem',
            padding: '1.25rem',
            minHeight: '240px', // Matches new card min-height
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          {/* Subtle shimmer overlay - doesn't move the card */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.06), transparent)',
              animation: 'skeleton-shimmer 2s infinite',
              pointerEvents: 'none',
              zIndex: 1
            }}
          />
          <div>
            {/* Title skeleton */}
            <div
              className="h-6 w-4/5 mb-2 rounded"
              style={{ background: 'var(--border-light)', opacity: 0.6 }}
            />

            {/* Author skeleton */}
            <div
              className="h-4 w-2/3 mb-3 rounded"
              style={{ background: 'var(--border-light)', opacity: 0.5 }}
            />

            {/* Badges skeleton */}
            <div className="flex gap-2 mb-3">
              <div
                className="h-6 w-16 rounded-full"
                style={{ background: 'var(--border-light)', opacity: 0.4 }}
              />
              <div
                className="h-6 w-20 rounded-full"
                style={{ background: 'var(--border-light)', opacity: 0.4 }}
              />
            </div>
          </div>

          {/* Buttons skeleton */}
          <div className="flex gap-2 mt-auto">
            <div
              className="h-9 flex-1 rounded-lg"
              style={{ background: 'var(--border-light)', opacity: 0.3 }}
            />
            <div
              className="h-9 flex-1 rounded-lg"
              style={{ background: 'var(--border-light)', opacity: 0.3 }}
            />
          </div>
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
