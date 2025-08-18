'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface Book {
  id: string;
  title: string;
  author: string;
  description?: string;
  genre?: string;
  cefrLevels?: string;
  estimatedHours?: number;
  totalChunks?: number;
  status: 'enhanced' | 'processing' | 'planned';
  progress?: number;
  chaptersRead?: number;
  simplificationCount?: number;
  availableLevels?: string[];
}

const ENHANCED_FEATURES = [
  {
    icon: '🎯',
    title: 'AI Text Simplification',
    description: '6 CEFR levels (A1-C2)'
  },
  {
    icon: '🎧',
    title: 'Premium Audio',
    description: '12 voices, word highlighting'
  },
  {
    icon: '📚',
    title: 'Vocabulary Builder',
    description: 'Interactive word definitions'
  },
  {
    icon: '📊',
    title: 'Progress Tracking',
    description: 'Reading analytics'
  }
];

export default function EnhancedCollectionDynamic() {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGenre, setSelectedGenre] = useState<string>('All');
  const [error, setError] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(9);
  const BOOKS_PER_PAGE = 9;

  useEffect(() => {
    fetchEnhancedBooks();
  }, []);

  const fetchEnhancedBooks = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/books/enhanced');
      
      if (!response.ok) {
        throw new Error('Failed to fetch enhanced books');
      }

      const data = await response.json();
      setBooks(data.books);
    } catch (err) {
      console.error('Error fetching enhanced books:', err);
      setError('Failed to load enhanced books. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  // Get unique genres from books
  const genres: string[] = ['All', ...new Set(books.map(book => book.genre).filter(Boolean) as string[])];

  // Filter books by selected genre
  const filteredBooks = selectedGenre === 'All' 
    ? books 
    : books.filter(book => book.genre === selectedGenre);

  // Group books by status
  const enhancedBooks = filteredBooks.filter(book => book.status === 'enhanced');
  const processingBooks = filteredBooks.filter(book => book.status === 'processing');
  const plannedBooks = filteredBooks.filter(book => book.status === 'planned');

  // Apply pagination to enhanced books (main section)
  const visibleEnhancedBooks = enhancedBooks.slice(0, visibleCount);
  const hasMoreBooks = enhancedBooks.length > visibleCount;

  const handleLoadMore = () => {
    setVisibleCount(prev => prev + BOOKS_PER_PAGE);
  };

  const handleGenreChange = (genre: string) => {
    setSelectedGenre(genre);
    setVisibleCount(BOOKS_PER_PAGE); // Reset pagination when changing genre
  };

  const BookCard = ({ book }: { book: Book }) => {
    const getAbbreviation = (title: string) => {
      // Custom abbreviations to match wireframe
      const customAbbrevs: Record<string, string> = {
        'Emma': 'EM',
        'Pride and Prejudice': 'P&P',
        'Frankenstein': 'FR',
        'The Great Gatsby': 'GG',
        'The Call of the Wild': 'CW',
        "Alice's Adventures in Wonderland": 'Alice',
        'Romeo and Juliet': 'R&J',
        'Dr. Jekyll and Mr. Hyde': 'J&H',
        'The Importance of Being Earnest': 'IBE',
        'The Yellow Wallpaper': 'YW'
      };
      
      if (customAbbrevs[title]) {
        return customAbbrevs[title];
      }
      
      const words = title.split(' ');
      if (words.length >= 2) {
        return words[0][0] + words[1][0];
      }
      return title.substring(0, 2).toUpperCase();
    };

    const getBookGradient = (title: string) => {
      // Unique gradients for each book to match wireframe diversity
      const gradients: Record<string, string> = {
        'Emma': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        'Pride and Prejudice': 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)', 
        'Frankenstein': 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
        'The Great Gatsby': 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
        'The Call of the Wild': 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
        "Alice's Adventures in Wonderland": 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
        'Romeo and Juliet': 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
        'Dr. Jekyll and Mr. Hyde': 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
        'The Importance of Being Earnest': 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
        'The Yellow Wallpaper': 'linear-gradient(135deg, #a8e6cf 0%, #dcedc8 100%)'
      };
      
      return gradients[title] || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
    };

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ scale: 1.02 }}
        style={{
          background: 'rgba(30, 41, 59, 0.8)',
          border: '1px solid #334155',
          borderRadius: '16px',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          overflow: 'hidden',
          width: '300px', // Fixed width to match wireframe
          height: 'auto'
        }}
      >
        {/* Status Badge */}
        <div style={{
          position: 'absolute',
          top: '16px',
          right: '16px',
          padding: '4px 8px',
          borderRadius: '8px',
          fontSize: '11px',
          fontWeight: '600',
          background: book.status === 'enhanced' ? 'rgba(16, 185, 129, 0.2)' :
                     book.status === 'processing' ? 'rgba(251, 191, 36, 0.2)' :
                     'rgba(156, 163, 175, 0.2)',
          color: book.status === 'enhanced' ? '#10b981' :
                 book.status === 'processing' ? '#fbbf24' :
                 '#9ca3af'
        }}>
          {book.status === 'enhanced' ? '✨ Enhanced' :
           book.status === 'processing' ? '🔄 Processing' :
           '📅 Planned'}
        </div>

        {/* Book Cover - Compact Square Design */}
        <div className="book-cover" style={{
          width: '100px',
          height: '120px',
          background: getBookGradient(book.title),
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: getAbbreviation(book.title).length > 3 ? '16px' : '24px',
          fontWeight: 'bold',
          color: 'white',
          marginBottom: '16px',
          alignSelf: 'flex-start',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
        }}>
          {getAbbreviation(book.title)}
        </div>

        {/* Book Info - Compact Layout */}
        <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '4px', color: 'white' }}>
          {book.title}
        </h3>
        <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '8px' }}>
          {book.author}
        </p>

        {/* CEFR Levels Badge */}
        <div style={{ fontSize: '12px', marginBottom: '8px' }}>
          <span style={{ 
            background: 'rgba(102, 126, 234, 0.2)', 
            color: '#667eea',
            padding: '3px 8px',
            borderRadius: '6px',
            marginRight: '6px',
            fontSize: '11px'
          }}>
            {book.cefrLevels}
          </span>
          <span style={{ color: '#64748b' }}>~{book.estimatedHours} hours</span>
          <span style={{ marginLeft: '8px', color: '#64748b' }}>{book.genre}</span>
        </div>

        {/* Simplification Levels - Wireframe Style */}
        <div style={{ 
          fontSize: '12px', 
          color: '#10b981',
          marginBottom: '12px'
        }}>
          <div style={{ fontWeight: '500' }}>
            {book.availableLevels?.length || 0} difficulty levels available
          </div>
          {book.availableLevels && book.availableLevels.length > 0 && (
            <div style={{ color: '#64748b', marginTop: '2px' }}>
              Levels: {book.availableLevels.join(', ')}
            </div>
          )}
        </div>

        {/* Short Description */}
        <p style={{ 
          fontSize: '13px', 
          color: '#94a3b8', 
          lineHeight: '1.4',
          marginBottom: '16px',
          overflow: 'hidden',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical'
        }}>
          Enhanced ESL edition with {book.availableLevels?.length || 0} difficulty levels available
        </p>

        {/* Progress Indicator - Simplified */}
        <div style={{ 
          fontSize: '11px', 
          color: '#64748b',
          marginBottom: '12px'
        }}>
          Progress: 0%
          <span style={{ marginLeft: '8px' }}>
            0/{book.totalChunks || 0} chapters
          </span>
        </div>

        {/* Start Reading Button - Wireframe Style */}
        <a
          href={`/library/${book.id}/read`}
          style={{
            display: 'block',
            textAlign: 'center',
            padding: '10px 20px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            border: 'none',
            borderRadius: '8px',
            color: 'white',
            fontWeight: '600',
            fontSize: '13px',
            textDecoration: 'none',
            cursor: 'pointer',
            transition: 'opacity 0.2s ease'
          }}
          onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
          onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
        >
          Start Reading
        </a>
      </motion.div>
    );
  };

  if (loading) {
    return (
      <div style={{ 
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>📚</div>
          <p style={{ fontSize: '18px', color: '#94a3b8' }}>Loading enhanced collection...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ 
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>❌</div>
          <p style={{ fontSize: '18px', color: '#ef4444' }}>{error}</p>
          <button
            onClick={fetchEnhancedBooks}
            style={{
              marginTop: '20px',
              padding: '12px 24px',
              background: '#667eea',
              border: 'none',
              borderRadius: '12px',
              color: 'white',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', padding: '40px 20px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="enhanced-collection-mobile-header"
          style={{ textAlign: 'center', marginBottom: '60px' }}
        >
          <h1 style={{ 
            fontSize: '48px', 
            fontWeight: 'bold',
            marginBottom: '16px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            ✨ Enhanced Collection
          </h1>
          <p style={{ fontSize: '18px', color: '#94a3b8' }}>
            Classic literature enhanced with AI-powered ESL learning tools
          </p>
          <p style={{ fontSize: '14px', color: '#64748b', marginTop: '8px' }}>
            Automatically updated with {books.length} books from our database
          </p>
        </motion.div>

        {/* Genre Filter */}
        <div className="genre-filter-container" style={{ 
          display: 'flex', 
          gap: '12px', 
          justifyContent: 'center',
          marginBottom: '40px',
          flexWrap: 'wrap',
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch'
        }}>
          <div className="genre-filter-scroll" style={{
            display: 'flex',
            gap: '12px',
            flexWrap: 'nowrap',
            minWidth: 'max-content'
          }}>
            {genres.map(genre => (
              <button
                key={genre}
                onClick={() => handleGenreChange(genre)}
                style={{
                  padding: '8px 20px',
                  background: selectedGenre === genre ? '#667eea' : 'transparent',
                  border: `2px solid ${selectedGenre === genre ? '#667eea' : '#334155'}`,
                  borderRadius: '24px',
                  color: selectedGenre === genre ? 'white' : '#94a3b8',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  whiteSpace: 'nowrap',
                  flexShrink: 0
                }}
              >
                {genre} ({genre === 'All' ? books.length : books.filter(b => b.genre === genre).length})
              </button>
            ))}
          </div>
        </div>

        {/* Enhanced Features */}
        <div className="enhanced-features-section" style={{
          background: 'rgba(102, 126, 234, 0.1)',
          borderRadius: '20px',
          padding: '40px',
          marginBottom: '60px'
        }}>
          <h2 style={{ 
            fontSize: '28px', 
            textAlign: 'center',
            marginBottom: '32px',
            color: '#e2e8f0'
          }}>
            ✨ Enhanced Features
          </h2>
          <div className="enhanced-features-grid" style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '24px'
          }}>
            {ENHANCED_FEATURES.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                style={{
                  textAlign: 'center',
                  padding: '24px',
                  background: 'rgba(30, 41, 59, 0.5)',
                  borderRadius: '16px',
                  border: '1px solid #334155'
                }}
              >
                <div className="feature-icon" style={{ fontSize: '48px', marginBottom: '16px' }}>
                  {feature.icon}
                </div>
                <h3 style={{ fontSize: '18px', marginBottom: '8px', color: '#10b981' }}>
                  {feature.title}
                </h3>
                <p style={{ fontSize: '14px', color: '#94a3b8' }}>
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Enhanced Books Section */}
        {enhancedBooks.length > 0 && (
          <>
            <h2 style={{ fontSize: '24px', marginBottom: '24px', color: '#10b981', textAlign: 'center' }}>
              ✅ Ready to Read ({enhancedBooks.length})
            </h2>
            <div className="books-grid-mobile" style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '20px',
              marginBottom: hasMoreBooks ? '40px' : '60px',
              justifyItems: 'center'
            }}>
              {visibleEnhancedBooks.map((book) => (
                <div key={book.id} className="book-card-mobile">
                  <BookCard book={book} />
                </div>
              ))}
            </div>
            
            {/* Load More Button */}
            {hasMoreBooks && (
              <div style={{ textAlign: 'center', marginBottom: '60px' }}>
                <motion.button
                  onClick={handleLoadMore}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  style={{
                    padding: '12px 24px',
                    borderRadius: '12px',
                    border: '2px solid #10b981',
                    background: 'transparent',
                    color: '#10b981',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  Load More Books ({enhancedBooks.length - visibleCount} remaining)
                </motion.button>
              </div>
            )}
          </>
        )}

        {/* Processing Books Section */}
        {processingBooks.length > 0 && (
          <>
            <h2 style={{ fontSize: '24px', marginBottom: '24px', color: '#fbbf24' }}>
              🔄 Currently Processing ({processingBooks.length})
            </h2>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: '24px',
              marginBottom: '60px'
            }}>
              {processingBooks.map((book) => (
                <BookCard key={book.id} book={book} />
              ))}
            </div>
          </>
        )}

        {/* Planned Books Section */}
        {plannedBooks.length > 0 && (
          <>
            <h2 style={{ fontSize: '24px', marginBottom: '24px', color: '#9ca3af' }}>
              📅 Planned for Enhancement ({plannedBooks.length})
            </h2>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: '24px'
            }}>
              {plannedBooks.map((book) => (
                <BookCard key={book.id} book={book} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}