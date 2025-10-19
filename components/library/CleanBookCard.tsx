'use client';

import React from 'react';
import { motion } from 'framer-motion';
import type { ExternalBook } from '@/types/book-sources';

interface CleanBookCardProps {
  book: ExternalBook;
  onAskAI: (book: ExternalBook) => void;
  onReadBook: (bookId: string) => void;
  index?: number;
}

export function CleanBookCard({ book, onAskAI, onReadBook, index = 0 }: CleanBookCardProps) {
  // Truncate long titles for better display
  const displayTitle = book.title.length > 60 
    ? book.title.substring(0, 57) + '...' 
    : book.title;
  
  // Truncate author name
  const displayAuthor = book.author.length > 35 
    ? book.author.substring(0, 32) + '...' 
    : book.author;
  
  // Get the primary subject/genre
  const primarySubject = book.subjects?.[0] || 'Classic Literature';
  
  // Format read count for display
  const formatReadCount = (count?: number): string => {
    if (!count) return '0 reads';
    if (count >= 1000000) return `${Math.floor(count / 1000000)}M reads`;
    if (count >= 1000) return `${Math.floor(count / 1000)}k reads`;
    return `${count} reads`;
  };
  
  // Truncate description
  const displayDescription = book.description && book.description.length > 150
    ? book.description.substring(0, 147) + '...'
    : book.description || 'A classic work of literature available for reading and analysis.';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      className="bg-[var(--bg-secondary)] border border-[var(--accent-secondary)] rounded-xl p-4 flex flex-col justify-between shadow-sm hover:shadow-md transition-all duration-200"
      style={{
        height: '240px',
        width: '320px',
        boxShadow: '0 2px 8px var(--shadow-soft)',
        cursor: 'pointer',
        marginBottom: '16px'
      }}
    >
      {/* Card Content */}
      <div className="flex-1 overflow-hidden">
        {/* Book Title */}
        <div className="text-lg font-bold text-[var(--text-accent)] mb-1 leading-tight line-clamp-2" style={{ fontFamily: 'Playfair Display, serif', maxHeight: '3.5rem' }}>
          {displayTitle}
        </div>
        {/* Author */}
        <div className="text-sm text-[var(--text-secondary)] mb-3" style={{ fontFamily: 'Source Serif Pro, serif' }}>
          by {displayAuthor}
        </div>
        {/* Meta Tags - Compact Style */}
        <div className="flex gap-2 mb-3 flex-wrap">
          <span className="px-2 py-1 bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] border border-[var(--accent-primary)]/30 rounded-full text-xs font-medium">
            {primarySubject}
          </span>
          {book.source && (
            <span className="px-2 py-1 bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] border border-[var(--accent-primary)]/30 rounded-full text-xs font-medium">
              {book.source}
            </span>
          )}
          {book.publicationYear && (
            <span className="px-2 py-1 bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] border border-[var(--accent-primary)]/30 rounded-full text-xs font-medium">
              {book.publicationYear}
            </span>
          )}
          <span className="px-2 py-1 bg-green-500/10 text-green-600 border border-green-500/30 rounded-full text-xs font-medium">
            Browse Library
          </span>
        </div>

      </div>

      {/* Action Buttons - Always at bottom */}
      <div className="flex gap-2 mt-4">
          <button
            onClick={() => onAskAI(book)}
            className="flex-1 h-9 rounded-lg bg-transparent text-[var(--accent-primary)] border border-[var(--accent-primary)]/30 hover:bg-[var(--accent-primary)]/10 hover:border-[var(--accent-primary)]/60 transition-all duration-200 text-sm font-medium"
            style={{ fontFamily: 'Source Serif Pro, serif' }}
          >
            Ask AI
          </button>
          <button
            onClick={() => onReadBook(book.id)}
            className="flex-1 h-9 bg-[var(--accent-primary)] text-[var(--bg-primary)] hover:bg-[var(--accent-secondary)] rounded-lg text-sm font-semibold transition-all duration-200 shadow-md hover:shadow-lg flex items-center justify-center"
            style={{ fontFamily: 'Source Serif Pro, serif' }}
          >
            Read Book
          </button>
        </div>
    </motion.div>
  );
}