/**
 * Book Grid Component
 * Displays book cards in responsive grid with cursor pagination
 * Follows Phase 3 component extraction pattern + Neo-Classic design system
 * References: NEO_CLASSIC_TRANSFORMATION_PLAN.md Phase 4 & 7 (Book cards)
 */

'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import type { FeaturedBook } from '@prisma/client';

interface BookGridProps {
  books: FeaturedBook[];
  loading?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  emptyMessage?: string;
}

export function BookGrid({
  books,
  loading = false,
  hasMore = false,
  onLoadMore,
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {books.map((book, index) => (
          <BookCard key={book.id} book={book} index={index} />
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

function BookCard({ book, index }: { book: FeaturedBook; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
    >
      <Link
        href={`/books/${book.slug}`}
        className="group block h-full"
      >
        <div
          className="h-full flex flex-col transition-all duration-300"
          style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-light)',
            borderRadius: '12px',
            padding: '1.5rem',
            boxShadow: '0 2px 8px var(--shadow-soft)'
          }}
        >
          {/* Book Cover - Gradient */}
          <div
            className="relative w-full aspect-[3/4] rounded-lg mb-4 overflow-hidden"
            style={{
              background: book.gradient || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              boxShadow: '0 4px 12px var(--shadow-soft)'
            }}
          >
            {/* Abbreviation */}
            <div className="absolute inset-0 flex items-center justify-center">
              <span
                className="text-6xl font-bold"
                style={{
                  fontFamily: '"Playfair Display", Georgia, serif',
                  color: 'rgba(255, 255, 255, 0.9)',
                  textShadow: '0 2px 4px rgba(0, 0, 0, 0.2)'
                }}
              >
                {book.abbreviation}
              </span>
            </div>

            {/* Badges */}
            <div className="absolute top-2 right-2 flex flex-col gap-1">
              {book.isNew && (
                <span
                  className="px-2 py-1 text-xs font-semibold rounded"
                  style={{
                    background: 'var(--accent-primary)',
                    color: 'var(--bg-primary)',
                    fontFamily: '"Source Serif Pro", Georgia, serif'
                  }}
                >
                  New
                </span>
              )}
              {book.isClassic && (
                <span
                  className="px-2 py-1 text-xs font-semibold rounded"
                  style={{
                    background: 'rgba(255, 255, 255, 0.2)',
                    color: 'white',
                    fontFamily: '"Source Serif Pro", Georgia, serif',
                    backdropFilter: 'blur(8px)'
                  }}
                >
                  Classic
                </span>
              )}
            </div>

            {/* Hover Overlay */}
            <div
              className="absolute inset-0 bg-black opacity-0 group-hover:opacity-20 transition-opacity"
            />
          </div>

          {/* Book Info */}
          <div className="flex-1 flex flex-col">
            <h3
              className="font-bold text-lg mb-1 line-clamp-2 group-hover:underline"
              style={{
                fontFamily: '"Playfair Display", Georgia, serif',
                color: 'var(--text-accent)',
                lineHeight: '1.3'
              }}
            >
              {book.title}
            </h3>

            <p
              className="text-sm mb-3"
              style={{
                fontFamily: '"Source Serif Pro", Georgia, serif',
                color: 'var(--text-secondary)'
              }}
            >
              {book.author}
            </p>

            {/* Description */}
            {book.description && (
              <p
                className="text-xs mb-3 line-clamp-2 flex-1"
                style={{
                  fontFamily: '"Source Serif Pro", Georgia, serif',
                  color: 'var(--text-tertiary)',
                  lineHeight: '1.5'
                }}
              >
                {book.description}
              </p>
            )}

            {/* Metadata */}
            <div className="flex items-center gap-3 text-xs mt-auto pt-3 border-t"
              style={{ borderColor: 'var(--border-light)' }}
            >
              {book.readingTimeMinutes > 0 && (
                <span
                  className="flex items-center gap-1"
                  style={{
                    color: 'var(--text-tertiary)',
                    fontFamily: '"Source Serif Pro", Georgia, serif'
                  }}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {book.readingTimeMinutes} min
                </span>
              )}

              {book.sentences > 0 && (
                <span
                  className="flex items-center gap-1"
                  style={{
                    color: 'var(--text-tertiary)',
                    fontFamily: '"Source Serif Pro", Georgia, serif'
                  }}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                  {book.sentences} sentences
                </span>
              )}
            </div>

            {/* Genres */}
            {book.genres && book.genres.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {book.genres.slice(0, 2).map(genre => (
                  <span
                    key={genre}
                    className="px-2 py-0.5 text-xs rounded-full"
                    style={{
                      background: 'var(--accent-primary)',
                      opacity: 0.1,
                      color: 'var(--accent-primary)',
                      fontFamily: '"Source Serif Pro", Georgia, serif',
                      fontSize: '0.7rem'
                    }}
                  >
                    {genre}
                  </span>
                ))}
                {book.genres.length > 2 && (
                  <span
                    className="px-2 py-0.5 text-xs rounded-full"
                    style={{
                      color: 'var(--text-tertiary)',
                      fontFamily: '"Source Serif Pro", Georgia, serif',
                      fontSize: '0.7rem'
                    }}
                  >
                    +{book.genres.length - 2}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </Link>
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
