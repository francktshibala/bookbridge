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
      transition={{ duration: 0.4, delay: index * 0.1 }}
      whileHover={{ y: -2, transition: { duration: 0.2 } }}
      className="clean-book-card"
      style={{
        background: '#1e293b',
        border: '1px solid #334155',
        borderRadius: '16px',
        padding: '24px',
        transition: 'all 0.3s ease',
        position: 'relative',
        cursor: 'default'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = '#667eea';
        e.currentTarget.style.boxShadow = '0 8px 32px rgba(102, 126, 234, 0.2)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = '#334155';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      {/* Book Header */}
      <div className="book-header" style={{ marginBottom: '16px' }}>
        <h3 
          className="book-title"
          style={{
            fontSize: '20px',
            fontWeight: 700,
            color: '#e2e8f0',
            marginBottom: '8px',
            lineHeight: '1.3'
          }}
        >
          {displayTitle}
        </h3>
        <p 
          className="book-author"
          style={{
            fontSize: '16px',
            color: '#94a3b8',
            marginBottom: '12px',
            margin: 0
          }}
        >
          by {displayAuthor}
        </p>
      </div>
      
      {/* Book Meta Tags */}
      <div 
        className="book-meta"
        style={{
          display: 'flex',
          gap: '12px',
          marginBottom: '16px',
          flexWrap: 'wrap'
        }}
      >
        <span 
          className="meta-tag genre-tag"
          style={{
            padding: '4px 12px',
            background: 'rgba(102, 126, 234, 0.2)',
            color: '#667eea',
            borderRadius: '12px',
            fontSize: '12px',
            fontWeight: 600
          }}
        >
          {primarySubject}
        </span>
        <span 
          className="meta-tag read-count"
          style={{
            padding: '4px 12px',
            background: 'rgba(16, 185, 129, 0.2)',
            color: '#10b981',
            borderRadius: '12px',
            fontSize: '12px',
            fontWeight: 600
          }}
        >
          {formatReadCount(book.popularity)}
        </span>
      </div>
      
      {/* Book Description */}
      <p 
        className="book-description"
        style={{
          fontSize: '14px',
          color: '#94a3b8',
          lineHeight: '1.5',
          marginBottom: '20px',
          display: '-webkit-box',
          WebkitLineClamp: 3,
          WebkitBoxOrient: 'vertical' as any,
          overflow: 'hidden'
        }}
      >
        {displayDescription}
      </p>
      
      {/* Book Actions */}
      <div 
        className="book-actions"
        style={{
          display: 'flex',
          gap: '12px'
        }}
      >
        <motion.button
          whileHover={{ y: -1, transition: { duration: 0.2 } }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onAskAI(book)}
          className="btn-ask-ai"
          style={{
            flex: 1,
            padding: '12px',
            background: 'transparent',
            border: '2px solid #8b5cf6',
            borderRadius: '8px',
            color: '#8b5cf6',
            fontWeight: 600,
            fontSize: '14px',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(139, 92, 246, 0.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
          }}
        >
          🤖 Ask AI
        </motion.button>
        
        <motion.button
          whileHover={{ y: -1, transition: { duration: 0.2 } }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onReadBook(book.id)}
          className="btn-read"
          style={{
            flex: 1,
            padding: '12px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            border: 'none',
            borderRadius: '8px',
            color: 'white',
            fontWeight: 600,
            fontSize: '14px',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          📖 Read Book
        </motion.button>
      </div>
    </motion.div>
  );
}