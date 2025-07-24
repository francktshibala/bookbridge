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

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ 
        duration: 0.4, 
        delay: index * 0.1,
        ease: "easeOut" 
      }}
      whileHover={{ 
        y: -4, 
        scale: 1.02,
        transition: { duration: 0.2 }
      }}
      style={{
        background: 'white',
        borderRadius: '16px',
        padding: '20px',
        minHeight: '280px',
        border: `2px solid ${colors.border}`,
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        position: 'relative',
        overflow: 'hidden'
      }}
      onClick={() => onAnalyze(book)}
    >
      {/* Background gradient based on source */}
      <div 
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '4px',
          background: `linear-gradient(90deg, ${colors.border}, ${colors.badge})`
        }}
      />

      {/* Header with source badge and confidence */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'flex-start',
        marginBottom: '12px'
      }}>
        <motion.span
          whileHover={{ scale: 1.05 }}
          style={{
            fontSize: '11px',
            fontWeight: '700',
            color: colors.badge,
            backgroundColor: colors.bg,
            padding: '4px 8px',
            borderRadius: '8px',
            border: `1px solid ${colors.border}`,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif'
          }}
        >
          {book.source.replace('-', ' ')}
        </motion.span>

        <div style={{ textAlign: 'right' }}>
          <div style={{
            fontSize: '10px',
            color: getConfidenceColor(confidence),
            fontWeight: '600',
            fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif'
          }}>
            {getConfidenceText(confidence)}
          </div>
          <div style={{
            fontSize: '9px',
            color: '#9ca3af',
            fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif'
          }}>
            {Math.round(confidence * 100)}% match
          </div>
        </div>
      </div>

      {/* Book cover placeholder */}
      <div style={{
        width: '60px',
        height: '80px',
        backgroundColor: colors.bg,
        borderRadius: '8px',
        border: `2px solid ${colors.border}`,
        marginBottom: '16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '24px',
        alignSelf: 'center'
      }}>
        {book.coverUrl ? (
          <img 
            src={book.coverUrl} 
            alt={`${book.title} cover`}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              borderRadius: '6px'
            }}
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              e.currentTarget.nextElementSibling!.textContent = '📚';
            }}
          />
        ) : null}
        <span style={{ display: book.coverUrl ? 'none' : 'block' }}>📚</span>
      </div>

      {/* Book details */}
      <div style={{ flex: 1 }}>
        <motion.h3
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: (index * 0.1) + 0.2 }}
          style={{
            fontSize: '16px',
            fontWeight: '700',
            color: '#1f2937',
            fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
            lineHeight: '1.3',
            marginBottom: '8px',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden'
          }}
        >
          {book.title}
        </motion.h3>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: (index * 0.1) + 0.3 }}
          style={{
            fontSize: '14px',
            color: colors.badge,
            fontWeight: '600',
            fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
            marginBottom: '12px'
          }}
        >
          by {book.author}
        </motion.p>

        {/* Genres */}
        {book.subjects.length > 0 && (
          <div style={{ marginBottom: '12px' }}>
            <div style={{
              fontSize: '11px',
              color: '#6b7280',
              backgroundColor: '#f9fafb',
              padding: '4px 8px',
              borderRadius: '12px',
              display: 'inline-block',
              fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
              fontWeight: '500'
            }}>
              {book.subjects[0]}
              {book.subjects.length > 1 && ` +${book.subjects.length - 1}`}
            </div>
          </div>
        )}

        {/* Recommendation reason */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: (index * 0.1) + 0.4 }}
          style={{
            fontSize: '12px',
            color: '#4b5563',
            fontStyle: 'italic',
            fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
            lineHeight: '1.4',
            marginBottom: '16px'
          }}
        >
          💡 {reason}
        </motion.p>
      </div>

      {/* Action button */}
      <motion.button
        whileHover={{ 
          scale: 1.02,
          boxShadow: `0 6px 20px ${colors.border}40`
        }}
        whileTap={{ scale: 0.98 }}
        style={{
          width: '100%',
          padding: '12px 16px',
          background: `linear-gradient(135deg, ${colors.border}, ${colors.badge})`,
          color: 'white',
          border: 'none',
          borderRadius: '12px',
          fontSize: '14px',
          fontWeight: '600',
          fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px'
        }}
        onClick={(e) => {
          e.stopPropagation();
          onAnalyze(book);
        }}
      >
        <span>✨</span>
        Analyze This Book
      </motion.button>
    </motion.div>
  );
}