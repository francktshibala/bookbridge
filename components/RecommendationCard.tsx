'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ExternalBook } from '@/types/book-sources';
import { BookRecommendation } from '@/lib/recommendation-engine';

interface RecommendationCardProps {
  recommendation: BookRecommendation;
  onAnalyze: (book: ExternalBook) => void;
  index: number;
}

export function RecommendationCard({ recommendation, onAnalyze, index }: RecommendationCardProps) {
  const { book, reason, confidence, score } = recommendation;
  const [imageLoaded, setImageLoaded] = React.useState(false);
  const [imageError, setImageError] = React.useState(false);

  // Truncate long titles for compact layout
  const displayTitle = book.title.length > 40 
    ? book.title.substring(0, 37) + '...' 
    : book.title;
  
  // Truncate author name for compact layout
  const displayAuthor = book.author.length > 25 
    ? book.author.substring(0, 22) + '...' 
    : book.author;

  // Enhanced color coding based on book source and genre
  const getSourceColor = (source: string) => {
    switch (source) {
      case 'gutenberg':
        return { bg: '#dbeafe', border: '#3b82f6', badge: '#1e40af' };
      case 'openlibrary':
        return { bg: '#fef3c7', border: '#f59e0b', badge: '#92400e' };
      case 'standard-ebooks':
        return { bg: '#d1fae5', border: '#10b981', badge: '#047857' };
      case 'googlebooks':
        return { bg: '#fce7f3', border: '#ec4899', badge: '#be185d' };
      default:
        return { bg: '#f3f4f6', border: '#6b7280', badge: '#374151' };
    }
  };

  const colors = getSourceColor(book.source);

  // Confidence indicator
  const getConfidenceText = (confidence: number) => {
    if (confidence >= 0.8) return 'Highly recommended';
    if (confidence >= 0.6) return 'Good match';
    if (confidence >= 0.4) return 'Might interest you';
    return 'Worth exploring';
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return '#059669'; // green
    if (confidence >= 0.6) return '#0891b2'; // blue
    if (confidence >= 0.4) return '#ea580c'; // orange
    return '#6b7280'; // gray
  };

  // Subject-based color schemes for consistency with CatalogBookCard
  const primarySubject = book.subjects?.[0] || 'Classic Literature';
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

  const gradientColors = getColorScheme();

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
        background: gradientColors.gradient,
        display: 'flex',
        alignItems: 'flex-end',
        padding: '16px',
        overflow: 'hidden'
      }}>
        {/* Book Cover Image with Modern Enhancements */}
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
                background: 'linear-gradient(45deg, #f0f0f0 25%, transparent 25%, transparent 75%, #f0f0f0 75%), linear-gradient(45deg, #f0f0f0 25%, transparent 25%, transparent 75%, #f0f0f0 75%)',
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

        {/* Confidence Badge */}
        <div 
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(15px)',
            borderRadius: '16px',
            padding: '6px 12px',
            fontSize: '11px',
            fontWeight: '700',
            color: '#ffffff',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
            zIndex: 3
          }}
        >
          {Math.round(confidence * 100)}% match
        </div>

        {/* Enhanced Subject Badge */}
        <div style={{
          position: 'absolute',
          bottom: '20px',
          left: '20px',
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(15px)',
          borderRadius: '16px',
          padding: '6px 14px',
          fontSize: '11px',
          color: gradientColors.badge,
          fontWeight: '700',
          textTransform: 'uppercase' as const,
          letterSpacing: '0.8px',
          border: `1px solid rgba(255, 255, 255, 0.3)`,
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

          {/* Compact Recommendation Reason */}
          <div style={{
            marginBottom: '16px',
            padding: '8px 12px',
            background: 'rgba(102, 126, 234, 0.08)',
            borderRadius: '8px',
            border: '1px solid rgba(102, 126, 234, 0.15)'
          }}>
            <p style={{
              fontSize: '11px',
              color: 'var(--text-secondary)',
              fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
              lineHeight: '1.3',
              margin: 0,
              opacity: 0.9,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              fontWeight: '600'
            }}>
              {Math.round(confidence * 100)}% match
            </p>
          </div>
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
            background: 'linear-gradient(135deg, #e2e8f0 0%, #cbd5e0 100%)',
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