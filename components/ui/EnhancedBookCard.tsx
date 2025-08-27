'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';

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
}

interface EnhancedBookCardProps {
  book: EnhancedBook;
  index?: number;
  onAskAI?: (book: any) => void;
}

export function EnhancedBookCard({ book, index = 0, onAskAI }: EnhancedBookCardProps) {
  const genreColors: Record<string, string> = {
    'Classic Literature': '#f59e0b',
    'Romance': '#ec4899',
    'Tragedy': '#ef4444',
    'Fantasy': '#8b5cf6',
    'Gothic': '#6b7280',
    'Short Story': '#3b82f6',
    'Horror': '#dc2626'
  };

  const genreColor = genreColors[book.genre || 'Classic Literature'] || '#667eea';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.5 }}
      whileHover={{ y: -4 }}
      className="enhanced-book-card"
      style={{
        position: 'relative',
        overflow: 'hidden',
        height: '100%',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      {/* Genre Accent Bar */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '4px',
        background: `linear-gradient(90deg, ${genreColor} 0%, ${genreColor}80 100%)`
      }} />

      {/* Main Content */}
      <div style={{ padding: '24px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Book Title & Author */}
        <div style={{ marginBottom: '16px' }}>
          <h3 className="book-title" style={{
            fontSize: '20px',
            fontWeight: '600',
            color: '#e2e8f0',
            marginBottom: '8px',
            lineHeight: '1.3',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden'
          }}>
            {book.title}
          </h3>
          <p className="book-author" style={{
            fontSize: '14px',
            color: '#94a3b8',
            marginBottom: '4px'
          }}>
            {book.author}
          </p>
          <p style={{
            fontSize: '12px',
            color: genreColor,
            fontWeight: '500'
          }}>
            {book.genre || 'Classic Literature'}
          </p>
        </div>

        {/* Feature Badges */}
        <div className="book-features" style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '8px',
          marginBottom: '16px',
          flex: 1
        }}>
          {/* Enhanced Badge */}
          <span className="enhanced-book-badge">
            <span style={{ marginRight: '4px' }}>✨</span>
            Enhanced
          </span>

          {/* Audio Badge */}
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            background: 'rgba(59, 130, 246, 0.2)',
            color: '#3b82f6',
            padding: '4px 8px',
            borderRadius: '12px',
            fontSize: '12px',
            fontWeight: '600'
          }}>
            <span>🎧</span>
            Audio
          </span>

          {/* CEFR Range */}
          <span className="cefr-range">
            {book.cefr.min}-{book.cefr.max}
          </span>
        </div>

        {/* Reading Info */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          marginBottom: '20px',
          paddingTop: '12px',
          borderTop: '1px solid #475569'
        }}>
          {book.estimatedReadingTime && (
            <div className="reading-time" style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span style={{ color: '#94a3b8', fontSize: '14px' }}>📖</span>
              <span style={{ color: '#cbd5e0', fontSize: '14px' }}>
                ~{book.estimatedReadingTime} reading
              </span>
            </div>
          )}
          
          {book.isComplete && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span style={{ color: '#10b981', fontSize: '14px' }}>✓</span>
              <span style={{ color: '#10b981', fontSize: '14px', fontWeight: '500' }}>
                Fully processed
              </span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div style={{
          display: 'flex',
          gap: '8px',
          marginTop: 'auto'
        }}>
          <Link 
            href={`/library/${book.id}/read`}
            style={{
              flex: 1,
              padding: '10px 16px',
              backgroundColor: '#667eea',
              color: 'white',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              textAlign: 'center',
              textDecoration: 'none',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#5b6df0';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#667eea';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            Start Reading
          </Link>
          
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
              padding: '10px 16px',
              backgroundColor: 'transparent',
              color: '#8b5cf6',
              border: '1px solid #8b5cf6',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(139, 92, 246, 0.1)';
              e.currentTarget.style.borderColor = '#a855f7';
              e.currentTarget.style.color = '#a855f7';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.borderColor = '#8b5cf6';
              e.currentTarget.style.color = '#8b5cf6';
            }}
          >
            🤖 Ask AI
          </button>
        </div>
      </div>

      {/* Hover Glow Effect */}
      <motion.div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: '200%',
          height: '200%',
          background: `radial-gradient(circle, ${genreColor}20 0%, transparent 70%)`,
          transform: 'translate(-50%, -50%)',
          opacity: 0,
          pointerEvents: 'none'
        }}
        whileHover={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      />
    </motion.div>
  );
}