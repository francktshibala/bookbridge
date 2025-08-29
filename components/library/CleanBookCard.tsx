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
      whileHover={{ scale: 1.01 }}
      style={{
        background: 'rgba(51, 65, 85, 0.5)',
        border: '1px solid #334155',
        borderRadius: '12px',
        padding: '16px',
        marginBottom: '16px'
      }}
    >
      {/* Book Title */}
      <div style={{
        fontSize: '16px',
        fontWeight: '600',
        color: '#e2e8f0',
        marginBottom: '4px'
      }}>
        {displayTitle}
      </div>

      {/* Author */}
      <div style={{
        fontSize: '14px',
        color: '#94a3b8',
        marginBottom: '12px'
      }}>
        by {displayAuthor}
      </div>

      {/* Meta Tags */}
      <div style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '12px',
        flexWrap: 'wrap'
      }}>
        <span style={{
          padding: '4px 8px',
          background: 'rgba(59, 130, 246, 0.2)',
          color: '#60a5fa',
          borderRadius: '4px',
          fontSize: '11px'
        }}>
          {primarySubject}
        </span>
        {book.source && (
          <span style={{
            padding: '4px 8px',
            background: 'rgba(59, 130, 246, 0.2)',
            color: '#60a5fa',
            borderRadius: '4px',
            fontSize: '11px'
          }}>
            {book.source}
          </span>
        )}
        {book.publicationYear && (
          <span style={{
            padding: '4px 8px',
            background: 'rgba(59, 130, 246, 0.2)',
            color: '#60a5fa',
            borderRadius: '4px',
            fontSize: '11px'
          }}>
            {book.publicationYear}
          </span>
        )}
        <span style={{
          padding: '4px 8px',
          background: 'rgba(16, 185, 129, 0.2)',
          color: '#10b981',
          borderRadius: '4px',
          fontSize: '11px'
        }}>
          Browse Library
        </span>
      </div>

      {/* Action Buttons */}
      <div style={{
        display: 'flex',
        gap: '8px'
      }}>
        <button
          onClick={() => onAskAI(book)}
          style={{
            flex: 1,
            height: '36px',
            borderRadius: '8px',
            background: 'rgba(139, 92, 246, 0.2)',
            color: '#a78bfa',
            border: '1px solid rgba(139, 92, 246, 0.3)',
            fontSize: '14px',
            fontWeight: '500',
            cursor: 'pointer'
          }}
        >
          Ask AI
        </button>
        <button
          onClick={() => onReadBook(book.id)}
          style={{
            flex: 1,
            height: '36px',
            background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '500',
            cursor: 'pointer'
          }}
        >
          Read Book
        </button>
      </div>
    </motion.div>
  );
}