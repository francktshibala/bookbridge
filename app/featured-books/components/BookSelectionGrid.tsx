'use client';

import { motion } from 'framer-motion';

/**
 * BookSelectionGrid Component
 *
 * Pure presentational component that displays a grid of featured books.
 * Extracted from page.tsx (lines 1464-1553) as part of Phase 3 refactor.
 *
 * @component
 * @example
 * <BookSelectionGrid
 *   books={FEATURED_BOOKS}
 *   onSelectBook={(book) => handleSelectBook(book)}
 *   onAskAI={(book) => handleAskAI(book)}
 * />
 */

export interface FeaturedBook {
  id: string;
  title: string;
  author: string;
  description: string;
  sentences: number;
  bundles: number;
  gradient: string;
  abbreviation: string;
}

interface BookSelectionGridProps {
  books: FeaturedBook[];
  onSelectBook: (book: FeaturedBook) => void;
  onAskAI: (book: FeaturedBook) => void;
}

export function BookSelectionGrid({
  books,
  onSelectBook,
  onAskAI
}: BookSelectionGridProps) {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <div className="max-w-6xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4 text-[var(--text-accent)]" style={{ fontFamily: 'Playfair Display, serif' }}>
            📚 Simplified Books
          </h1>
          <p className="text-[var(--text-secondary)] text-lg" style={{ fontFamily: 'Source Serif Pro, serif' }}>
            Experience continuous reading with perfect text-audio harmony
          </p>
        </div>

        {/* Simplified Books Grid - Wireframe Layout */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-5xl mx-auto mb-12 px-4">
          {books.map((book, index) => (
            <motion.div
              key={book.id}
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
                  <div className="text-lg font-bold text-[var(--text-accent)] mb-1 leading-tight" style={{ fontFamily: 'Playfair Display, serif' }}>
                    {book.title}
                  </div>

                  {/* Author */}
                  <div className="text-sm text-[var(--text-secondary)] mb-3" style={{ fontFamily: 'Source Serif Pro, serif' }}>
                    by {book.author}
                  </div>

                  {/* Meta Tags - Compact Style */}
                  <div className="flex gap-2 mb-3 flex-wrap">
                    <span className="px-2 py-1 bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] border border-[var(--accent-primary)]/30 rounded-full text-xs font-medium">
                      {book.id === 'great-gatsby-a2' ? 'A2' : 'A1-C2'}
                    </span>
                    <span className="px-2 py-1 bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] border border-[var(--accent-primary)]/30 rounded-full text-xs font-medium">
                      Classic
                    </span>
                    <span className="px-2 py-1 bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] border border-[var(--accent-primary)]/30 rounded-full text-xs font-medium">
                      {book.id === 'great-gatsby-a2' ? '~7.5h' : '~2h'}
                    </span>
                  </div>

                  {/* Action Buttons - Compact Style */}
                  <div className="flex gap-2 mt-auto">
                    <button
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent card click
                        onAskAI(book);
                      }}
                      className="flex-1 h-9 rounded-lg bg-transparent text-[var(--accent-primary)] border border-[var(--accent-primary)]/30 hover:bg-[var(--accent-primary)]/10 hover:border-[var(--accent-primary)]/60 transition-all duration-200 text-sm font-medium"
                      style={{ fontFamily: 'Source Serif Pro, serif' }}
                    >
                      Ask AI
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent card click
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
          ))}
        </div>

      </div>
    </div>
  );
}
