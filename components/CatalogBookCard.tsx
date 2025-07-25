'use client';

import React from 'react';
import { motion } from 'framer-motion';
import type { ExternalBook } from '@/types/book-sources';

interface CatalogBookCardProps {
  book: ExternalBook;
  onAnalyze: (book: ExternalBook) => void;
  index?: number;
}

export function CatalogBookCard({ book, onAnalyze, index = 0 }: CatalogBookCardProps) {
  const [imageLoaded, setImageLoaded] = React.useState(false);
  const [imageError, setImageError] = React.useState(false);
  // Truncate long titles
  const displayTitle = book.title.length > 50 
    ? book.title.substring(0, 47) + '...' 
    : book.title;
  
  // Truncate author name
  const displayAuthor = book.author.length > 30 
    ? book.author.substring(0, 27) + '...' 
    : book.author;
  
  // Get the primary subject/genre
  const primarySubject = book.subjects?.[0] || 'Classic Literature';
  
  // Subject-based color schemes
  const subjectColors: Record<string, { gradient: string; badge: string; badgeBg: string }> = {
    'Fiction': {
      gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      badge: '#8b5cf6',
      badgeBg: '#f3e8ff'
    },
    'Science Fiction': {
      gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
      badge: '#0ea5e9',
      badgeBg: '#e0f2fe'
    },
    'Romance': {
      gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      badge: '#ec4899',
      badgeBg: '#fdf2f8'
    },
    'History': {
      gradient: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
      badge: '#f59e0b',
      badgeBg: '#fef3c7'
    },
    'Philosophy': {
      gradient: 'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
      badge: '#6366f1',
      badgeBg: '#e0e7ff'
    },
    'Poetry': {
      gradient: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
      badge: '#f472b6',
      badgeBg: '#fce7f3'
    },
    'default': {
      gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      badge: '#8b5cf6',
      badgeBg: '#f3e8ff'
    }
  };
  
  // Find matching color scheme
  const getColorScheme = () => {
    const subjectLower = primarySubject.toLowerCase();
    for (const [key, value] of Object.entries(subjectColors)) {
      if (subjectLower.includes(key.toLowerCase())) {
        return value;
      }
    }
    return subjectColors.default;
  };
  
  const colors = getColorScheme();
  
  // Source badge configurations
  const sourceBadges = {
    'gutenberg': {
      text: 'PG',
      fullText: 'Project Gutenberg',
      bgColor: '#e6f3ff',
      textColor: '#1e40af',
      borderColor: '#3b82f6'
    },
    'openlibrary': {
      text: 'OL',
      fullText: 'Open Library',
      bgColor: '#fef3c7',
      textColor: '#92400e',
      borderColor: '#f59e0b'
    },
    'standard-ebooks': {
      text: 'SE',
      fullText: 'Standard Ebooks',
      bgColor: '#f0fdf4',
      textColor: '#15803d',
      borderColor: '#22c55e'
    },
    'googlebooks': {
      text: 'GB',
      fullText: 'Google Books',
      bgColor: '#fff1f2',
      textColor: '#be123c',
      borderColor: '#f43f5e'
    }
  };
  
  const sourceBadge = sourceBadges[book.source as keyof typeof sourceBadges] || {
    text: book.source.substring(0, 2).toUpperCase(),
    fullText: book.source,
    bgColor: '#f3f4f6',
    textColor: '#4b5563',
    borderColor: '#9ca3af'
  };
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        delay: index * 0.05,
        duration: 0.4,
        ease: "easeOut"
      }}
      whileHover={{ 
        y: -12,
        scale: 1.03,
        boxShadow: '0 12px 24px rgba(0, 0, 0, 0.25), 0 25px 50px rgba(0, 0, 0, 0.4), 0 6px 12px rgba(0, 0, 0, 0.2), 0 0 0 2px rgba(102, 126, 234, 0.4), 0 0 40px rgba(102, 126, 234, 0.3)',
        borderColor: 'var(--brand-primary)',
        transition: { 
          duration: 0.3,
          ease: [0.4, 0, 0.2, 1]
        }
      }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onAnalyze(book)}
      style={{
        background: 'var(--surface-elevated)',
        borderRadius: '20px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.15), 0 10px 25px rgba(0, 0, 0, 0.25), 0 2px 4px rgba(0, 0, 0, 0.1)',
        cursor: 'pointer',
        overflow: 'hidden',
        border: '1px solid var(--border-light)',
        position: 'relative' as const,
        width: '100%',
        maxWidth: '350px',
        aspectRatio: '1',
        display: 'flex',
        flexDirection: 'column',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        backdropFilter: 'blur(10px)'
      }}
    >
      {/* Enhanced Cover Image with Modern Styling */}
      <div style={{
        position: 'relative',
        height: '140px',
        background: colors.gradient,
        display: 'flex',
        alignItems: 'flex-end',
        padding: '16px',
        overflow: 'hidden'
      }}>
        {/* Enhanced Book Cover Image */}
        {book.coverUrl && !imageError && (
          <>
            <img
              src={book.coverUrl}
              alt={`Cover of ${book.title}`}
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageError(true)}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                objectPosition: 'center',
                filter: 'contrast(1.1) saturate(1.2) brightness(1.05)',
                transform: 'scale(1.02)',
                transition: 'opacity 0.3s ease',
                opacity: imageLoaded ? 1 : 0
              }}
            />
            {/* Loading placeholder */}
            {!imageLoaded && (
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'linear-gradient(45deg, rgba(45, 55, 72, 0.3) 25%, transparent 25%, transparent 75%, rgba(45, 55, 72, 0.3) 75%), linear-gradient(45deg, rgba(45, 55, 72, 0.3) 25%, transparent 25%, transparent 75%, rgba(45, 55, 72, 0.3) 75%)',
                backgroundSize: '20px 20px',
                backgroundPosition: '0 0, 10px 10px',
                animation: 'shimmer 1.5s ease-in-out infinite'
              }} />
            )}
          </>
        )}
        
        {/* Modern Gradient Overlay for Better Text Contrast */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: (book.coverUrl && !imageError) 
            ? 'linear-gradient(135deg, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.4) 60%, rgba(0,0,0,0.8) 100%)'
            : 'transparent',
          backdropFilter: (book.coverUrl && !imageError) ? 'blur(0.5px)' : 'none',
          zIndex: 2
        }} />
        
        {/* Subtle Shine Effect */}
        {book.coverUrl && !imageError && imageLoaded && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: '-100%',
            width: '100%',
            height: '100%',
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)',
            animation: 'shimmer 4s infinite',
            pointerEvents: 'none',
            zIndex: 4
          }} />
        )}
        {/* Enhanced Source Badge */}
        <div 
          title={sourceBadge.fullText}
          style={{
            position: 'absolute',
            top: '16px',
            left: '16px',
            background: 'rgba(26, 32, 44, 0.9)',
            color: '#e2e8f0',
            borderRadius: '12px',
            padding: '8px 12px',
            fontSize: '12px',
            fontWeight: '700',
            border: `1px solid ${sourceBadge.borderColor}`,
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            letterSpacing: '0.5px',
            backdropFilter: 'blur(10px)',
            zIndex: 3
          }}
        >
          {sourceBadge.text}
        </div>
        
        {/* Enhanced Rating Badge */}
        {((book.popularity && book.popularity > 0) || book.metadata?.averageRating) && (
          <div style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(15px)',
            borderRadius: '20px',
            padding: '8px 12px',
            fontSize: '12px',
            fontWeight: '600',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
            zIndex: 3
          }}>
            {book.metadata?.averageRating ? (
              <>
                <span style={{ fontSize: '10px' }}>⭐</span>
                {book.metadata.averageRating.toFixed(1)}
                {book.metadata.ratingsCount && (
                  <span style={{ fontSize: '10px', color: '#718096' }}>
                    ({book.metadata.ratingsCount})
                  </span>
                )}
              </>
            ) : (
              <>
                <span style={{ fontSize: '10px' }}>📚</span>
                {(book.popularity || 0).toLocaleString()} reads
              </>
            )}
          </div>
        )}
        
        {/* Enhanced Subject Badge */}
        <div style={{
          position: 'absolute',
          bottom: '20px',
          left: '20px',
          background: 'rgba(26, 32, 44, 0.9)',
          backdropFilter: 'blur(15px)',
          borderRadius: '16px',
          padding: '6px 14px',
          fontSize: '11px',
          color: '#a5b4fc',
          fontWeight: '700',
          textTransform: 'uppercase' as const,
          letterSpacing: '0.8px',
          border: '1px solid rgba(102, 126, 234, 0.3)',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          zIndex: 3
        }}>
          {primarySubject}
        </div>
      </div>

      {/* Compact Content Section */}
      <div style={{ 
        padding: '20px',
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        background: 'linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)',
        position: 'relative',
        justifyContent: 'space-between'
      }}>
        <div>
          {/* Compact Book Title */}
          <h3 style={{
            fontSize: '1.1rem',
            fontWeight: '900',
            marginBottom: '6px',
            color: 'var(--text-primary)',
            lineHeight: '1.2',
            fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
            letterSpacing: '-0.01em',
            textShadow: '0 1px 2px rgba(0,0,0,0.1)',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden'
          }}>
            {displayTitle}
          </h3>
          
          {/* Compact Author Name */}
          <p style={{
            color: 'var(--text-secondary)',
            marginBottom: '12px',
            fontSize: '0.9rem',
            fontWeight: '500',
            fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
            opacity: 0.85,
            fontStyle: 'italic',
            letterSpacing: '0.01em'
          }}>
            by {displayAuthor}
          </p>

          {/* Compact Year Info */}
          {book.publicationYear && (
            <div style={{
              marginBottom: '16px'
            }}>
              <span style={{
                fontSize: '11px',
                color: 'var(--text-secondary)',
                fontWeight: '600',
                opacity: 0.7,
                letterSpacing: '0.5px',
                textTransform: 'uppercase'
              }}>
                {book.publicationYear}
              </span>
            </div>
          )}
        </div>

        {/* Compact Analyze Button */}
        <motion.button
          whileHover={{ 
            scale: 1.02,
            boxShadow: '0 8px 25px rgba(102, 126, 234, 0.6), 0 0 0 1px rgba(255,255,255,0.1)',
            y: -2
          }}
          whileTap={{ scale: 0.98 }}
          style={{
            width: '100%',
            padding: '12px 16px',
            background: 'linear-gradient(135deg, var(--brand-primary) 0%, var(--brand-secondary) 50%, #8b5cf6 100%)',
            color: '#ffffff',
            border: 'none',
            borderRadius: '16px',
            fontSize: '0.95rem',
            fontWeight: '700',
            fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            position: 'relative',
            overflow: 'hidden',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4), inset 0 1px 0 rgba(255,255,255,0.2)',
            letterSpacing: '0.02em',
            textShadow: '0 1px 2px rgba(0,0,0,0.2)'
          }}
          onClick={(e) => {
            e.stopPropagation();
            onAnalyze(book);
          }}
        >
          {/* Enhanced Shimmer Effect */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: '-100%',
            width: '100%',
            height: '100%',
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
            animation: 'shimmer 3s infinite',
            zIndex: 1
          }} />
          
          {/* Compact Icon */}
          <span style={{ 
            fontSize: '1.1rem', 
            zIndex: 2,
            filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))'
          }}>
            🧠
          </span>
          
          {/* Compact Text */}
          <span style={{ 
            zIndex: 2,
            background: 'linear-gradient(135deg, #ffffff 0%, #f0f9ff 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            Analyze
          </span>
        </motion.button>
      </div>
    </motion.div>
  );
}