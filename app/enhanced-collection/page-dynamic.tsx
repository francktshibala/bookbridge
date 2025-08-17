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
  const genres = ['All', ...new Set(books.map(book => book.genre).filter(Boolean))];

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
      const words = title.split(' ');
      if (words.length >= 2) {
        return words[0][0] + words[1][0];
      }
      return title.substring(0, 2).toUpperCase();
    };

    const getProgressPercentage = () => {
      if (!book.totalChunks || !book.chaptersRead) return 0;
      return Math.round((book.chaptersRead / book.totalChunks) * 100);
    };

    const progress = getProgressPercentage();

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ scale: 1.02 }}
        style={{
          background: 'rgba(30, 41, 59, 0.8)',
          border: '1px solid #334155',
          borderRadius: '16px',
          padding: '24px',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* Status Badge */}
        <div style={{
          position: 'absolute',
          top: '16px',
          right: '16px',
          padding: '4px 12px',
          borderRadius: '12px',
          fontSize: '12px',
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

        {/* Book Cover Placeholder */}
        <div style={{
          width: '120px',
          height: '160px',
          background: `linear-gradient(135deg, #667eea 0%, #764ba2 100%)`,
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '32px',
          fontWeight: 'bold',
          color: 'white',
          marginBottom: '20px',
          alignSelf: 'center'
        }}>
          {getAbbreviation(book.title)}
        </div>

        {/* Book Info */}
        <h3 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '8px' }}>
          {book.title}
        </h3>
        <p style={{ fontSize: '14px', color: '#94a3b8', marginBottom: '12px' }}>
          {book.author}
        </p>

        {/* Book Details */}
        <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px' }}>
          <span style={{ 
            background: 'rgba(102, 126, 234, 0.2)', 
            color: '#667eea',
            padding: '2px 8px',
            borderRadius: '8px',
            marginRight: '8px'
          }}>
            {book.cefrLevels}
          </span>
          <span>~{book.estimatedHours} hours</span>
          {book.genre && (
            <span style={{ marginLeft: '8px' }}>{book.genre}</span>
          )}
        </div>

        {/* Simplification Info */}
        {book.simplificationCount && book.simplificationCount > 0 && (
          <div style={{ 
            fontSize: '12px', 
            color: '#10b981',
            marginBottom: '12px',
            padding: '8px',
            background: 'rgba(16, 185, 129, 0.1)',
            borderRadius: '8px'
          }}>
            {book.simplificationCount} difficulty levels available
            {book.availableLevels && (
              <div style={{ marginTop: '4px', color: '#64748b' }}>
                Levels: {book.availableLevels.join(', ')}
              </div>
            )}
          </div>
        )}

        {/* Description */}
        <p style={{ 
          fontSize: '14px', 
          color: '#94a3b8', 
          lineHeight: '1.6',
          marginBottom: '20px',
          flex: 1
        }}>
          {book.description}
        </p>

        {/* Progress Bar */}
        {progress > 0 && (
          <div style={{ marginBottom: '16px' }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between',
              fontSize: '12px',
              color: '#64748b',
              marginBottom: '4px'
            }}>
              <span>Progress: {progress}%</span>
              <span>{book.chaptersRead}/{book.totalChunks} chunks</span>
            </div>
            <div style={{
              height: '6px',
              background: '#334155',
              borderRadius: '3px',
              overflow: 'hidden'
            }}>
              <div style={{
                width: `${progress}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
                transition: 'width 0.3s ease'
              }} />
            </div>
          </div>
        )}

        {/* Action Button */}
        <a
          href={`/library/${book.id}/read`}
          style={{
            display: 'block',
            textAlign: 'center',
            padding: '12px 24px',
            background: book.status === 'enhanced' 
              ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
              : 'transparent',
            border: book.status === 'enhanced' ? 'none' : '2px solid #334155',
            borderRadius: '12px',
            color: book.status === 'enhanced' ? 'white' : '#64748b',
            fontWeight: '600',
            textDecoration: 'none',
            cursor: book.status === 'enhanced' ? 'pointer' : 'not-allowed',
            opacity: book.status === 'enhanced' ? 1 : 0.5
          }}
        >
          {book.status === 'enhanced' ? 'Start Reading' :
           book.status === 'processing' ? 'Coming Soon' :
           'Planned'}
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
        <div style={{ 
          display: 'flex', 
          gap: '12px', 
          justifyContent: 'center',
          marginBottom: '40px',
          flexWrap: 'wrap'
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
                transition: 'all 0.2s ease'
              }}
            >
              {genre} ({genre === 'All' ? books.length : books.filter(b => b.genre === genre).length})
            </button>
          ))}
        </div>

        {/* Enhanced Features */}
        <div style={{
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
          <div style={{
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
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>
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
            <h2 style={{ fontSize: '24px', marginBottom: '24px', color: '#10b981' }}>
              ✅ Ready to Read ({enhancedBooks.length})
            </h2>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: '24px',
              marginBottom: hasMoreBooks ? '40px' : '60px'
            }}>
              {visibleEnhancedBooks.map((book) => (
                <BookCard key={book.id} book={book} />
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