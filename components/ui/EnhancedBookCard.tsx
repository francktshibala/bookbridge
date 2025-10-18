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
      whileHover={{ scale: 1.01, y: -2 }}
      className="neo-classic-card theme-transition"
      style={{
        background: 'linear-gradient(135deg, var(--bg-primary), var(--bg-secondary))',
        border: '2px solid var(--accent-secondary)',
        borderRadius: '12px',
        padding: '16px',
        marginBottom: '16px',
        width: '100%',
        boxShadow: '0 6px 20px rgba(205, 127, 50, 0.2)',
        cursor: 'pointer',
        minHeight: '140px',
        display: 'grid',
        alignContent: 'end'
      }}
    >
      {/* Book Title */}
      <div className="neo-classic-subtitle" style={{
        fontSize: '16px',
        fontWeight: '700',
        color: 'var(--text-accent)',
        marginBottom: '4px',
        fontFamily: 'Playfair Display, serif'
      }}>
        {book.title}
      </div>

      {/* Author */}
      <div className="neo-classic-meta" style={{
        fontSize: '11px',
        color: 'var(--text-secondary)',
        marginBottom: '12px',
        opacity: '0.85'
      }}>
        {book.author}
      </div>

      {/* Meta Tags */}
      <div style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '12px',
        flexWrap: 'wrap'
      }}>
        <span className="neo-classic-badge" style={{
          padding: '4px 8px',
          background: 'rgba(205, 127, 50, 0.1)',
          color: 'var(--text-accent)',
          border: '1px solid var(--text-accent)',
          borderRadius: '999px',
          fontSize: '11px',
          fontWeight: '600'
        }}>
          {book.cefr.min}-{book.cefr.max}
        </span>
        <span className="neo-classic-badge" style={{
          padding: '4px 8px',
          background: 'rgba(205, 127, 50, 0.1)',
          color: 'var(--text-accent)',
          border: '1px solid var(--text-accent)',
          borderRadius: '999px',
          fontSize: '11px',
          fontWeight: '600'
        }}>
          {book.genre || 'Classic'}
        </span>
        <span className="neo-classic-badge" style={{
          padding: '4px 8px',
          background: 'rgba(205, 127, 50, 0.1)',
          color: 'var(--text-accent)',
          border: '1px solid var(--text-accent)',
          borderRadius: '999px',
          fontSize: '11px',
          fontWeight: '600'
        }}>
          {book.estimatedReadingTime || '~4h'}
        </span>
        <span className="neo-classic-badge-enhanced" style={{
          padding: '4px 8px',
          background: 'rgba(205, 127, 50, 0.1)',
          color: 'var(--accent-secondary)',
          border: '1px solid var(--accent-secondary)',
          borderRadius: '999px',
          fontSize: '11px',
          fontWeight: '600'
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

      {/* Action Button - Wireframe Style */}
      <div style={{ marginTop: '8px' }}>
        <Link
          href={`/library/${book.id}/read`}
          className="neo-classic-card-button"
          style={{
            fontSize: '12px',
            padding: '6px 10px',
            borderRadius: '999px',
            background: 'var(--accent-primary)',
            color: 'var(--bg-primary)',
            border: '1px solid var(--text-accent)',
            textDecoration: 'none',
            display: 'inline-block',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            width: 'fit-content'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--accent-secondary)';
            e.currentTarget.style.color = 'var(--bg-primary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'var(--accent-primary)';
            e.currentTarget.style.color = 'var(--bg-primary)';
          }}
        >
          Start Reading
        </Link>
      </div>
    </motion.div>
  );
}