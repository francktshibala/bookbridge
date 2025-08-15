'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ExternalBook } from '@/types/book-sources';
import { BookRecommendation } from '@/lib/recommendation-engine';
import { useRecommendations } from '@/lib/use-recommendations';
import { RecommendationCard } from './RecommendationCard';

interface RecommendationsSectionProps {
  targetBook?: ExternalBook; // If provided, show "Related to [Book]" recommendations
  onAnalyzeBook: (book: ExternalBook) => void;
  userId?: string;
  title?: string;
  subtitle?: string;
  maxRecommendations?: number;
}

export function RecommendationsSection({
  targetBook,
  onAnalyzeBook,
  userId,
  title,
  subtitle,
  maxRecommendations = 8
}: RecommendationsSectionProps) {
  const [recommendations, setRecommendations] = useState<BookRecommendation[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { loading, getRecommendations, getGeneralRecommendations } = useRecommendations({ userId });

  // Auto-generate title based on context
  const displayTitle = title || (targetBook 
    ? `📚 Books Similar to "${targetBook.title}"` 
    : '✨ Recommended for You'
  );

  const displaySubtitle = subtitle || (targetBook
    ? `Discover books with similar themes, authors, and subjects`
    : 'Popular books that other readers enjoyed'
  );

  // Load recommendations when component mounts or targetBook changes
  useEffect(() => {
    const loadRecommendations = async () => {
      setError(null);
      
      try {
        let result;
        if (targetBook) {
          result = await getRecommendations(targetBook.id, { limit: maxRecommendations });
        } else {
          result = await getGeneralRecommendations({ limit: maxRecommendations });
        }

        if (result.success) {
          setRecommendations(result.recommendations);
          console.log('✨ Loaded recommendations:', result.recommendations.length);
        } else {
          setError(result.error || 'Failed to load recommendations');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        console.error('❌ Error loading recommendations:', err);
      }
    };

    loadRecommendations();
  }, [targetBook?.id, getRecommendations, getGeneralRecommendations, maxRecommendations]);

  // Loading skeleton
  const LoadingSkeleton = () => (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
      gap: '24px',
      marginTop: '24px',
      justifyItems: 'center'
    }}>
      {Array.from({ length: maxRecommendations }, (_, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: index * 0.1 }}
          style={{
            background: 'white',
            borderRadius: '16px',
            minHeight: '280px',
            border: '2px solid #e5e7eb',
            display: 'flex',
            flexDirection: 'column',
            padding: '20px'
          }}
        >
          {/* Header skeleton */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{
              width: '80px',
              height: '20px',
              backgroundColor: '#f3f4f6',
              borderRadius: '8px'
            }} />
            <div style={{
              width: '60px',
              height: '20px',
              backgroundColor: '#f3f4f6',
              borderRadius: '8px'
            }} />
          </div>

          {/* Cover skeleton */}
          <div style={{
            width: '60px',
            height: '80px',
            backgroundColor: '#f3f4f6',
            borderRadius: '8px',
            marginBottom: '16px',
            alignSelf: 'center'
          }} />

          {/* Content skeleton */}
          <div style={{ flex: 1 }}>
            <div style={{
              width: '100%',
              height: '16px',
              backgroundColor: '#f3f4f6',
              borderRadius: '4px',
              marginBottom: '8px'
            }} />
            <div style={{
              width: '80%',
              height: '14px',
              backgroundColor: '#f3f4f6',
              borderRadius: '4px',
              marginBottom: '12px'
            }} />
            <div style={{
              width: '60px',
              height: '24px',
              backgroundColor: '#f3f4f6',
              borderRadius: '12px',
              marginBottom: '12px'
            }} />
            <div style={{
              width: '100%',
              height: '12px',
              backgroundColor: '#f3f4f6',
              borderRadius: '4px',
              marginBottom: '16px'
            }} />
          </div>

          {/* Button skeleton */}
          <div style={{
            width: '100%',
            height: '40px',
            backgroundColor: '#f3f4f6',
            borderRadius: '12px'
          }} />
        </motion.div>
      ))}
    </div>
  );

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      style={{
        marginTop: '48px',
        marginBottom: '48px'
      }}
    >
      {/* Section Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        style={{ textAlign: 'center', marginBottom: '32px' }}
      >
        <motion.h2
          style={{
            fontSize: '32px',
            fontWeight: '800',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
            marginBottom: '12px',
            lineHeight: '1.2'
          }}
        >
          {displayTitle}
        </motion.h2>
        
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          style={{
            fontSize: '16px',
            color: '#6b7280',
            fontWeight: '500',
            fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
            maxWidth: '600px',
            margin: '0 auto',
            lineHeight: '1.5'
          }}
        >
          {displaySubtitle}
        </motion.p>
      </motion.div>

      {/* Error State */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            style={{
              background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
              border: '2px solid #fca5a5',
              borderRadius: '16px',
              padding: '24px',
              textAlign: 'center',
              marginBottom: '24px'
            }}
          >
            <div style={{
              fontSize: '32px',
              marginBottom: '12px'
            }}>
              😔
            </div>
            <h3 style={{
              fontSize: '18px',
              fontWeight: '600',
              color: '#dc2626',
              fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
              marginBottom: '8px'
            }}>
              Oops! Couldn't Load Recommendations
            </h3>
            <p style={{
              fontSize: '14px',
              color: '#7f1d1d',
              fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif'
            }}>
              {error}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading State */}
      {loading && !error && <LoadingSkeleton />}

      {/* Recommendations Grid */}
      <AnimatePresence>
        {!loading && !error && recommendations.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
              gap: '32px',
              justifyItems: 'center',
              padding: '0 12px'
            }}
          >
            {recommendations.map((recommendation, index) => (
              <RecommendationCard
                key={recommendation.book.id}
                recommendation={recommendation}
                onAnalyze={onAnalyzeBook}
                index={index}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty State */}
      <AnimatePresence>
        {!loading && !error && recommendations.length === 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            style={{
              textAlign: 'center',
              padding: '64px 32px',
              background: 'white',
              borderRadius: '24px',
              border: '2px solid #e5e7eb',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
            }}
          >
            <div style={{ fontSize: '48px', marginBottom: '24px' }}>📚</div>
            <h3 style={{
              fontSize: '24px',
              fontWeight: '700',
              color: '#374151',
              fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
              marginBottom: '12px'
            }}>
              No Recommendations Yet
            </h3>
            <p style={{
              fontSize: '16px',
              color: '#6b7280',
              fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
              maxWidth: '400px',
              margin: '0 auto',
              lineHeight: '1.5'
            }}>
              {targetBook 
                ? `We're still building recommendations for "${targetBook.title}". Try exploring more books to help us learn your preferences!`
                : `Start exploring books to get personalized recommendations based on your interests!`
              }
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Recommendation Stats (Debug Info) */}
      {recommendations.length > 0 && process.env.NODE_ENV === 'development' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          style={{
            marginTop: '24px',
            padding: '16px',
            background: '#f8fafc',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            fontSize: '12px',
            color: '#64748b',
            fontFamily: 'monospace',
            textAlign: 'center'
          }}
        >
          📊 Generated {recommendations.length} recommendations • 
          Avg confidence: {Math.round((recommendations.reduce((sum, rec) => sum + rec.confidence, 0) / recommendations.length) * 100)}% • 
          {targetBook ? `Based on "${targetBook.title}"` : 'General recommendations'}
        </motion.div>
      )}
    </motion.section>
  );
}