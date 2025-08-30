'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ContentAvailabilityBadge, ContentAvailability } from '../offline/ContentAvailabilityBadge';

interface EnhancedBook {
  id: string;
  title: string;
  author: string;
  simplificationCount?: number;
  estimatedReadingTime?: string;
  isComplete: boolean;
  coverUrl?: string;
  genre?: string;
  cefr: {
    min: string;
    max: string;
  };
  contentAvailability?: ContentAvailability;
}

interface EnhancedBookCardProps {
  book: EnhancedBook;
  index?: number;
  onAskAI?: (book: any) => void;
}

export function EnhancedBookCard({ book, index = 0, onAskAI }: EnhancedBookCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.5 }}
      whileHover={{ scale: 1.01 }}
      style={{
        background: 'rgba(51, 65, 85, 0.5)',
        border: '1px solid #334155',
        borderRadius: '12px',
        padding: '16px',
        marginBottom: '16px',
        width: '100%'
      }}
    >
      {/* Book Title */}
      <div style={{
        fontSize: '16px',
        fontWeight: '600',
        color: '#e2e8f0',
        marginBottom: '4px'
      }}>
        {book.title}
      </div>

      {/* Author */}
      <div style={{
        fontSize: '14px',
        color: '#94a3b8',
        marginBottom: '12px'
      }}>
        by {book.author}
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
          {book.cefr.min}-{book.cefr.max}
        </span>
        <span style={{
          padding: '4px 8px',
          background: 'rgba(59, 130, 246, 0.2)',
          color: '#60a5fa',
          borderRadius: '4px',
          fontSize: '11px'
        }}>
          {book.genre || 'Classic'}
        </span>
        <span style={{
          padding: '4px 8px',
          background: 'rgba(59, 130, 246, 0.2)',
          color: '#60a5fa',
          borderRadius: '4px',
          fontSize: '11px'
        }}>
          {book.estimatedReadingTime || '~4h'}
        </span>
        <span style={{
          padding: '4px 8px',
          background: 'rgba(16, 185, 129, 0.2)',
          color: '#10b981',
          borderRadius: '4px',
          fontSize: '11px'
        }}>
          Enhanced ⚡
        </span>
        {book.contentAvailability && (
          <ContentAvailabilityBadge 
            availability={book.contentAvailability}
            variant="compact"
          />
        )}
      </div>

      {/* Action Buttons */}
      <div style={{
        display: 'flex',
        gap: '8px'
      }}>
        <button
          onClick={() => {
            if (onAskAI) {
              onAskAI({
                id: book.id,
                title: book.title,
                author: book.author,
                description: `Enhanced ESL edition with ${book.cefr.min}-${book.cefr.max} difficulty levels available`,
                subjects: book.genre ? [book.genre] : ['Literature'],
                language: 'en',
                source: 'gutenberg',
                popularity: 1
              });
            }
          }}
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
        <Link
          href={`/library/${book.id}/read`}
          style={{
            flex: 1,
            height: '36px',
            background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '500',
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer'
          }}
        >
          Read Enhanced
        </Link>
      </div>
    </motion.div>
  );
}