'use client';

import { EnhancedBookCard } from './EnhancedBookCard';
import { motion } from 'framer-motion';
import { useIsMobile } from '@/hooks/useIsMobile';

interface EnhancedBooksGridProps {
  books?: string[];
  showFeatureBadges?: boolean;
  layout?: 'grid-3x3' | 'grid-2x2' | 'list';
  onAskAI?: (book: any) => void;
}

// Enhanced book data for the 7 ESL books + featured books
const ENHANCED_BOOKS_DATA = {
  'gutenberg-1342': {
    id: 'gutenberg-1342',
    title: 'Pride and Prejudice',
    author: 'Jane Austen',
    genre: 'Romance',
    simplificationCount: 50,
    estimatedReadingTime: '4 hours',
    isComplete: true,
    cefr: { min: 'B1', max: 'C2' }
  },
  'the-necklace': {
    id: 'the-necklace',
    title: 'The Necklace',
    author: 'Guy de Maupassant',
    genre: 'Short Story',
    simplificationCount: 15,
    estimatedReadingTime: '30 minutes',
    isComplete: true,
    cefr: { min: 'A1', max: 'B1' }
  },
  'refugee-journey-1': {
    id: 'refugee-journey-1',
    title: 'Refugee Journey: From War Zone to Hope',
    author: 'Modern Story',
    genre: 'Modern Story',
    simplificationCount: 20,
    estimatedReadingTime: '25 minutes',
    isComplete: true,
    cefr: { min: 'A1', max: 'A1' }
  },
  'gutenberg-1513': {
    id: 'gutenberg-1513',
    title: 'Romeo and Juliet',
    author: 'William Shakespeare',
    genre: 'Tragedy',
    simplificationCount: 35,
    estimatedReadingTime: '3 hours',
    isComplete: true,
    cefr: { min: 'B1', max: 'C2' }
  },
  'gutenberg-84': {
    id: 'gutenberg-84',
    title: 'Frankenstein',
    author: 'Mary Shelley',
    genre: 'Gothic',
    simplificationCount: 45,
    estimatedReadingTime: '5 hours',
    isComplete: true,
    cefr: { min: 'B2', max: 'C2' }
  },
  'gutenberg-11': {
    id: 'gutenberg-11',
    title: 'Alice in Wonderland',
    author: 'Lewis Carroll',
    genre: 'Fantasy',
    simplificationCount: 30,
    estimatedReadingTime: '2.5 hours',
    isComplete: true,
    cefr: { min: 'A2', max: 'C1' }
  },
  'gutenberg-64317': {
    id: 'gutenberg-64317',
    title: 'The Great Gatsby',
    author: 'F. Scott Fitzgerald',
    genre: 'Classic Literature',
    simplificationCount: 40,
    estimatedReadingTime: '3.5 hours',
    isComplete: true,
    cefr: { min: 'B2', max: 'C2' }
  },
  'gutenberg-43': {
    id: 'gutenberg-43',
    title: 'Dr. Jekyll and Mr. Hyde',
    author: 'Robert Louis Stevenson',
    genre: 'Horror',
    simplificationCount: 25,
    estimatedReadingTime: '2 hours',
    isComplete: true,
    cefr: { min: 'B1', max: 'C2' }
  },
  'gutenberg-1952': {
    id: 'gutenberg-1952',
    title: 'The Yellow Wallpaper',
    author: 'Charlotte Perkins Gilman',
    genre: 'Short Story',
    simplificationCount: 15,
    estimatedReadingTime: '45 minutes',
    isComplete: true,
    cefr: { min: 'B1', max: 'C1' }
  }
};

export function EnhancedBooksGrid({ 
  books = Object.keys(ENHANCED_BOOKS_DATA),
  showFeatureBadges = true,
  layout = 'grid-3x3',
  onAskAI
}: EnhancedBooksGridProps) {
  const { isMobile } = useIsMobile();
  
  const getGridClass = () => {
    switch (layout) {
      case 'grid-2x2':
        return 'grid-cols-1 md:grid-cols-2 gap-6';
      case 'list':
        return 'grid-cols-1 gap-4';
      default:
        return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6';
    }
  };

  const enhancedBooksToShow = books
    .filter(bookId => ENHANCED_BOOKS_DATA[bookId as keyof typeof ENHANCED_BOOKS_DATA])
    .map(bookId => ENHANCED_BOOKS_DATA[bookId as keyof typeof ENHANCED_BOOKS_DATA]);

  return (
    <div style={{ width: '100%', padding: '0 20px' }}>
      {/* Section Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        style={{ textAlign: 'center', marginBottom: '48px' }}
      >
        <h2 style={{
          fontSize: '36px',
          fontWeight: 'bold',
          color: 'var(--text-accent)',
          marginBottom: '16px'
        }}>
          ESL Enhanced Collection
        </h2>
        <p style={{
          fontSize: '18px',
          color: 'var(--text-secondary)',
          maxWidth: '600px',
          margin: '0 auto'
        }}>
          Classic literature and modern stories adapted for English learners with AI-powered simplification
        </p>
      </motion.div>

      {/* Books Grid */}
      <div 
        className={`enhanced-books-grid grid ${getGridClass()}`}
        style={{
          display: 'grid',
          justifyItems: 'center',
          alignItems: 'start',
          maxWidth: isMobile ? '100%' : (enhancedBooksToShow.length <= 3 ? '900px' : '1200px'),
          margin: '0 auto',
          padding: isMobile ? '0 16px' : '0',
          gridTemplateColumns: isMobile ? '1fr' : undefined
        }}
      >
        {enhancedBooksToShow.map((book, index) => (
          <EnhancedBookCard 
            key={book.id} 
            book={book} 
            index={index}
            onAskAI={onAskAI}
          />
        ))}
      </div>

      {/* CTA Section */}
      {books.length === 3 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          style={{
            textAlign: 'center',
            marginTop: '48px'
          }}
        >
          <a
            href="/enhanced-collection"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '16px 32px',
              backgroundColor: 'var(--accent-primary)',
              color: 'var(--bg-secondary)',
              border: '2px solid var(--accent-primary)',
              borderRadius: '12px',
              fontSize: '16px',
              fontWeight: '600',
              textDecoration: 'none',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--accent-secondary)';
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.borderColor = 'var(--accent-secondary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--accent-primary)';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.borderColor = 'var(--accent-primary)';
            }}
          >
            Explore All Enhanced Books
            <span style={{ fontSize: '20px' }}>→</span>
          </a>
        </motion.div>
      )}

      {/* Feature Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.6 }}
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '24px',
          marginTop: '64px',
          padding: '32px',
          backgroundColor: 'var(--bg-secondary)',
          borderRadius: '16px',
          border: '1px solid var(--border-light)'
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: 'var(--accent-secondary)' }}>7</div>
          <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '4px' }}>Enhanced Books</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: 'var(--accent-primary)' }}>6</div>
          <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '4px' }}>CEFR Levels</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: 'var(--accent-primary)' }}>250+</div>
          <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '4px' }}>Simplified Chapters</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: 'var(--accent-secondary)' }}>100%</div>
          <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '4px' }}>Audio Support</div>
        </div>
      </motion.div>
    </div>
  );
}