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
        y: -6,
        transition: { duration: 0.2 }
      }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onAnalyze(book)}
      style={{
        background: 'white',
        borderRadius: '16px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05), 0 10px 20px rgba(0, 0, 0, 0.1)',
        cursor: 'pointer',
        overflow: 'hidden',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        position: 'relative' as const,
        width: '100%',
        maxWidth: '320px',
        height: '100%',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      {/* Cover Image or Gradient Header */}
      <div style={{
        position: 'relative',
        height: book.coverUrl ? '200px' : '120px',
        background: book.coverUrl ? `url(${book.coverUrl}) center/cover` : colors.gradient,
        display: 'flex',
        alignItems: 'flex-end',
        padding: '16px'
      }}>
        {/* Source Badge in Top Left */}
        <div 
          title={sourceBadge.fullText}
          style={{
            position: 'absolute',
            top: '12px',
            left: '12px',
            background: sourceBadge.bgColor,
            color: sourceBadge.textColor,
            borderRadius: '8px',
            padding: '6px 10px',
            fontSize: '13px',
            fontWeight: '700',
            border: `2px solid ${sourceBadge.borderColor}`,
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
            letterSpacing: '0.5px'
          }}
        >
          {sourceBadge.text}
        </div>
        
        {/* Popularity/Rating Badge */}
        {((book.popularity && book.popularity > 0) || book.metadata?.averageRating) && (
          <div style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            background: 'rgba(255, 255, 255, 0.9)',
            backdropFilter: 'blur(10px)',
            borderRadius: '20px',
            padding: '6px 12px',
            fontSize: '12px',
            fontWeight: '600',
            color: '#4a5568',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
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
        
        {/* Subject Badge */}
        <div style={{
          position: 'absolute',
          bottom: '12px',
          left: '12px',
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(10px)',
          borderRadius: '20px',
          padding: '4px 12px',
          fontSize: '11px',
          color: colors.badge,
          fontWeight: '600',
          textTransform: 'uppercase' as const,
          letterSpacing: '0.5px',
          border: `1px solid ${colors.badgeBg}`
        }}>
          {primarySubject}
        </div>
      </div>

      {/* Content */}
      <div style={{ 
        padding: '20px',
        flex: 1,
        display: 'flex',
        flexDirection: 'column'
      }}>
        <h3 style={{
          fontSize: '18px',
          fontWeight: '700',
          marginBottom: '8px',
          color: '#1a202c',
          lineHeight: '1.3',
          fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif'
        }}>
          {displayTitle}
        </h3>
        
        <p style={{
          color: '#4a5568',
          marginBottom: '16px',
          fontSize: '14px',
          fontWeight: '500',
          fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif'
        }}>
          by {displayAuthor}
        </p>

        {/* Language and Source */}
        <div style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '16px',
          flexWrap: 'wrap'
        }}>
          <span style={{
            fontSize: '12px',
            color: '#718096',
            backgroundColor: '#f7fafc',
            padding: '4px 8px',
            borderRadius: '6px',
            fontWeight: '500'
          }}>
            {book.language.toUpperCase()}
          </span>
          <span 
            title={sourceBadge.fullText}
            style={{
              fontSize: '12px',
              color: sourceBadge.textColor,
              backgroundColor: sourceBadge.bgColor,
              padding: '4px 10px',
              borderRadius: '6px',
              fontWeight: '700',
              border: `1px solid ${sourceBadge.borderColor}`,
              letterSpacing: '0.5px'
            }}
          >
            {sourceBadge.text}
          </span>
          {book.publicationYear && (
            <span style={{
              fontSize: '12px',
              color: '#718096',
              backgroundColor: '#f7fafc',
              padding: '4px 8px',
              borderRadius: '6px',
              fontWeight: '500'
            }}>
              {book.publicationYear}
            </span>
          )}
          {book.metadata?.pageCount && (
            <span style={{
              fontSize: '12px',
              color: '#718096',
              backgroundColor: '#f7fafc',
              padding: '4px 8px',
              borderRadius: '6px',
              fontWeight: '500'
            }}>
              {book.metadata.pageCount} pages
            </span>
          )}
        </div>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Analyze Button */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          style={{
            width: '100%',
            padding: '12px',
            background: colors.gradient,
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            fontSize: '14px',
            fontWeight: '600',
            fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            marginTop: 'auto'
          }}
          onClick={(e) => {
            e.stopPropagation();
            onAnalyze(book);
          }}
        >
          <span>🤖</span>
          Analyze This Book
        </motion.button>
      </div>
    </motion.div>
  );
}