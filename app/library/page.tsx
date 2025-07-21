'use client';

import React, { useState, useEffect } from 'react';
import { AccessibleWrapper } from '@/components/AccessibleWrapper';
import { useAccessibility } from '@/contexts/AccessibilityContext';
import { AIChat } from '@/components/AIChat';
import { motion } from 'framer-motion';

interface Book {
  id: string;
  title: string;
  author: string;
  description?: string;
  genre?: string;
  publishYear?: number;
  language: string;
  publicDomain: boolean;
  createdAt: string;
}

interface BooksResponse {
  books: Book[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export default function LibraryPage() {
  const { announceToScreenReader } = useAccessibility();
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  });

  const fetchBooks = async (page: number = 1, search: string = '') => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10'
      });

      if (search) {
        params.append('search', search);
      }

      const response = await fetch(`/api/books?${params}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch books');
      }

      const data: BooksResponse = await response.json();
      console.log('Fetched books data:', data);
      setBooks(data.books || []);
      setPagination(data.pagination || {
        page: 1,
        limit: 10,
        total: 0,
        pages: 0
      });

      const resultCount = data.books.length;
      const message = search 
        ? `Found ${resultCount} book${resultCount === 1 ? '' : 's'} matching "${search}"`
        : `Loaded ${resultCount} book${resultCount === 1 ? '' : 's'}`;
      
      announceToScreenReader(message);

    } catch (error) {
      console.error('Error fetching books:', error);
      setError('Failed to load books. Please try again.');
      announceToScreenReader('Error loading books', 'assertive');
      
      // For debugging: Add mock data when API fails
      const mockBooks = [
        {
          id: 'mock-1',
          title: 'Pride and Prejudice',
          author: 'Jane Austen',
          description: 'A classic novel about love and society.',
          genre: 'Romance',
          publishYear: 1813,
          language: 'en',
          publicDomain: true,
          createdAt: new Date().toISOString()
        },
        {
          id: 'mock-2',
          title: 'The Adventures of Tom Sawyer',
          author: 'Mark Twain',
          description: 'A young boy\'s adventures along the Mississippi River.',
          genre: 'Fiction',
          publishYear: 1876,
          language: 'en',
          publicDomain: true,
          createdAt: new Date().toISOString()
        },
        {
          id: 'mock-3',
          title: 'Frankenstein',
          author: 'Mary Shelley',
          description: 'A scientist creates a living being from dead tissue.',
          genre: 'Science Fiction',
          publishYear: 1818,
          language: 'en',
          publicDomain: true,
          createdAt: new Date().toISOString()
        }
      ];
      
      console.log('Using mock books for debugging:', mockBooks);
      setBooks(mockBooks);
      setPagination({
        page: 1,
        limit: 10,
        total: mockBooks.length,
        pages: 1
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBooks();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchBooks(1, searchTerm);
  };

  const handlePageChange = (newPage: number) => {
    fetchBooks(newPage, searchTerm);
  };

  const handleBookSelect = (book: Book) => {
    console.log('Book selected:', book);
    setSelectedBook(book);
    announceToScreenReader(`Selected book: ${book.title} by ${book.author}`);
  };

  const handleBackToLibrary = () => {
    setSelectedBook(null);
    announceToScreenReader('Returned to library view');
  };

  if (selectedBook) {
    return (
      <div className="min-h-screen" style={{
        backgroundColor: '#fafafa',
        backgroundImage: `
          radial-gradient(circle at 20% 50%, rgba(120, 119, 198, 0.1) 0%, transparent 50%),
          radial-gradient(circle at 80% 80%, rgba(255, 119, 198, 0.1) 0%, transparent 50%),
          radial-gradient(circle at 40% 20%, rgba(255, 219, 112, 0.1) 0%, transparent 50%)
        `
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <AccessibleWrapper as="header" className="mb-8">
              <motion.button
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2, duration: 0.4 }}
                whileHover={{ x: -4, transition: { duration: 0.2 } }}
                whileTap={{ scale: 0.95 }}
                onClick={handleBackToLibrary}
                aria-label="Return to library"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'white',
                  border: '2px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '12px 20px',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#4a5568',
                  fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  marginBottom: '32px',
                  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#667eea';
                  e.currentTarget.style.backgroundColor = '#f8faff';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#e2e8f0';
                  e.currentTarget.style.backgroundColor = 'white';
                  e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.05)';
                }}
              >
                ← Back to Library
              </motion.button>
              
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.5 }}
                style={{
                  background: 'white',
                  borderRadius: '24px',
                  padding: '40px',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  marginBottom: '32px'
                }}
              >
                <motion.h1 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4, duration: 0.4 }}
                  style={{
                    fontSize: '42px',
                    fontWeight: '800',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    marginBottom: '12px',
                    fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                    lineHeight: '1.2'
                  }}
                >
                  {selectedBook.title}
                </motion.h1>
                
                <motion.p 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5, duration: 0.4 }}
                  style={{
                    fontSize: '22px',
                    color: '#4a5568',
                    fontWeight: '600',
                    marginBottom: '24px',
                    fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif'
                  }}
                >
                  by {selectedBook.author}
                </motion.p>
                
                {selectedBook.description && (
                  <motion.p 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6, duration: 0.4 }}
                    style={{
                      fontSize: '18px',
                      color: '#2d3748',
                      lineHeight: '1.7',
                      marginBottom: '32px',
                      fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                      fontWeight: '500'
                    }}
                  >
                    {selectedBook.description}
                  </motion.p>
                )}
                
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7, duration: 0.4 }}
                  style={{ 
                    display: 'flex', 
                    gap: '16px',
                    flexWrap: 'wrap',
                    marginBottom: '32px'
                  }}
                >
                  {selectedBook.genre && (
                    <motion.span 
                      whileHover={{ scale: 1.05 }}
                      style={{
                        fontSize: '14px',
                        color: '#667eea',
                        fontWeight: '600',
                        backgroundColor: '#f0f4ff',
                        border: '2px solid #e0e7ff',
                        padding: '8px 16px',
                        borderRadius: '20px',
                        fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif'
                      }}
                    >
                      Genre: {selectedBook.genre}
                    </motion.span>
                  )}
                  {selectedBook.publishYear && (
                    <motion.span 
                      whileHover={{ scale: 1.05 }}
                      style={{
                        fontSize: '14px',
                        color: '#667eea',
                        fontWeight: '600',
                        backgroundColor: '#f0f4ff',
                        border: '2px solid #e0e7ff',
                        padding: '8px 16px',
                        borderRadius: '20px',
                        fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif'
                      }}
                    >
                      Published: {selectedBook.publishYear}
                    </motion.span>
                  )}
                  <motion.span 
                    whileHover={{ scale: 1.05 }}
                    style={{
                      fontSize: '14px',
                      color: '#667eea',
                      fontWeight: '600',
                      backgroundColor: '#f0f4ff',
                      border: '2px solid #e0e7ff',
                      padding: '8px 16px',
                      borderRadius: '20px',
                      fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif'
                    }}
                  >
                    Language: {selectedBook.language}
                  </motion.span>
                </motion.div>

                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8, duration: 0.4 }}
                >
                  <motion.a
                    href={`/library/${selectedBook.id}/read`}
                    whileHover={{ 
                      y: -3,
                      boxShadow: '0 12px 32px rgba(102, 126, 234, 0.4)',
                      transition: { duration: 0.2 }
                    }}
                    whileTap={{ scale: 0.95 }}
                    aria-label={`Read ${selectedBook.title}`}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '12px',
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      color: 'white',
                      textDecoration: 'none',
                      padding: '18px 36px',
                      borderRadius: '16px',
                      fontSize: '18px',
                      fontWeight: '700',
                      fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                      transition: 'all 0.2s ease',
                      boxShadow: '0 4px 12px rgba(102, 126, 234, 0.25)'
                    }}
                  >
                    📖 Start Reading
                  </motion.a>
                </motion.div>
              </motion.div>
            </AccessibleWrapper>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9, duration: 0.5 }}
            >
              <h2 id="ai-chat-section" style={{
                fontSize: '32px',
                fontWeight: '700',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                marginBottom: '24px',
                fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                textAlign: 'center'
              }}>
                🤖 Ask AI About This Book
              </h2>
              
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1.0, duration: 0.4 }}
                style={{
                  background: 'white',
                  borderRadius: '24px',
                  padding: '32px',
                  minHeight: '500px',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                {/* Decorative gradient overlay */}
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '4px',
                  background: 'linear-gradient(90deg, #667eea 0%, #764ba2 50%, #f093fb 100%)'
                }} />
                
                <AIChat
                  bookId={selectedBook.id}
                  bookTitle={selectedBook.title}
                  bookContext={`Title: ${selectedBook.title}, Author: ${selectedBook.author}${selectedBook.description ? `, Description: ${selectedBook.description}` : ''}`}
                />
              </motion.div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{
      backgroundColor: '#fafafa',
      backgroundImage: `
        radial-gradient(circle at 20% 50%, rgba(120, 119, 198, 0.1) 0%, transparent 50%),
        radial-gradient(circle at 80% 80%, rgba(255, 119, 198, 0.1) 0%, transparent 50%),
        radial-gradient(circle at 40% 20%, rgba(255, 219, 112, 0.1) 0%, transparent 50%)
      `
    }}>
    <div className="max-w-4xl mx-auto p-4">
      <AccessibleWrapper as="header" className="mb-8">
        <h1 style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          textAlign: 'center',
          fontSize: '48px',
          fontWeight: '800',
          marginBottom: '16px',
          fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
          letterSpacing: '-0.5px',
          lineHeight: '1.1'
        }}>✨ BookBridge Library ✨</h1>
        <p style={{
          textAlign: 'center',
          fontSize: '18px',
          color: '#4a5568',
          fontWeight: '500',
          fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
          marginBottom: '32px',
          maxWidth: '600px',
          margin: '0 auto 32px auto',
          lineHeight: '1.6'
        }}>
          Discover and explore our curated collection of public domain books with AI-powered insights and conversations.
        </p>

        <form onSubmit={handleSearch} style={{ 
          display: 'flex', 
          gap: '12px',
          maxWidth: '500px',
          margin: '0 auto'
        }}>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search books by title, author, or genre..."
            style={{
              flex: 1,
              padding: '14px 20px',
              border: '2px solid #e2e8f0',
              borderRadius: '12px',
              fontSize: '16px',
              fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
              fontWeight: '500',
              color: '#2d3748',
              backgroundColor: 'white',
              outline: 'none',
              transition: 'all 0.2s ease'
            }}
            onFocus={(e) => {
              e.target.style.borderColor = '#667eea';
              e.target.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.1)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = '#e2e8f0';
              e.target.style.boxShadow = 'none';
            }}
            aria-label="Search books"
          />
          <button
            type="submit"
            disabled={loading}
            style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              padding: '14px 24px',
              fontSize: '16px',
              fontWeight: '600',
              fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.4)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            Search
          </button>
        </form>
      </AccessibleWrapper>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          role="alert"
          aria-live="assertive"
          style={{
            background: 'linear-gradient(135deg, #fed7d7 0%, #feb2b2 100%)',
            border: '1px solid #fc8181',
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '24px',
            textAlign: 'center'
          }}
        >
          <div style={{
            color: '#c53030',
            fontSize: '16px',
            fontWeight: '600',
            fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
            marginBottom: '12px'
          }}>{error}</div>
          <button
            onClick={() => fetchBooks()}
            style={{
              color: '#c53030',
              fontSize: '14px',
              fontWeight: '600',
              fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
              background: 'none',
              border: 'none',
              textDecoration: 'underline',
              cursor: 'pointer',
              transition: 'color 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#9c2626';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#c53030';
            }}
          >
            Try Again
          </button>
        </motion.div>
      )}

      {loading ? (
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          style={{ textAlign: 'center', padding: '64px 0' }}
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              border: '3px solid #e2e8f0',
              borderTop: '3px solid #667eea',
              margin: '0 auto 16px auto'
            }}
          />
          <motion.p 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            style={{
              color: '#4a5568',
              fontSize: '16px',
              fontWeight: '500',
              fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif'
            }}
          >
            Loading your books...
          </motion.p>
          
          {/* Loading dots animation */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '4px',
              marginTop: '12px'
            }}
          >
            {[0, 1, 2].map((index) => (
              <motion.div
                key={index}
                animate={{
                  y: [0, -8, 0],
                  opacity: [0.4, 1, 0.4]
                }}
                transition={{
                  duration: 1,
                  repeat: Infinity,
                  delay: index * 0.2,
                  ease: "easeInOut"
                }}
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: '#667eea'
                }}
              />
            ))}
          </motion.div>
        </motion.div>
      ) : (
        <AccessibleWrapper as="main" ariaLabelledBy="books-list-heading">
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            marginBottom: '32px',
            flexWrap: 'wrap',
            gap: '16px'
          }}>
            <h2 id="books-list-heading" style={{
              fontSize: '28px',
              fontWeight: '700',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
              margin: 0
            }}>
              {searchTerm ? `Search Results for "${searchTerm}"` : 'Available Books'}
            </h2>
            <span style={{
              fontSize: '14px',
              color: '#718096',
              fontWeight: '500',
              fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
              backgroundColor: '#f7fafc',
              padding: '6px 12px',
              borderRadius: '20px'
            }}>
              {pagination.total} book{pagination.total === 1 ? '' : 's'} total
            </span>
          </div>

          {books.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              style={{ textAlign: 'center', padding: '64px 32px' }}
            >
              <div style={{ fontSize: '48px', marginBottom: '24px' }}>📚</div>
              <p style={{
                color: '#4a5568',
                fontSize: '18px',
                fontWeight: '500',
                fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                marginBottom: '24px'
              }}>
                {searchTerm ? 'No books found matching your search.' : 'No books available yet.'}
              </p>
              <a 
                href="/upload" 
                style={{
                  display: 'inline-block',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  textDecoration: 'none',
                  padding: '14px 28px',
                  borderRadius: '12px',
                  fontSize: '16px',
                  fontWeight: '600',
                  fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 8px 25px rgba(102, 126, 234, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                Upload a Book
              </a>
            </motion.div>
          ) : (
            <>
              {/* Centered book grid with Framer Motion */}
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'center',
                gap: '24px',
                marginBottom: '32px',
                maxWidth: '1200px',
                margin: '0 auto 32px auto'
              }}>
                {(books.length > 0 ? books : [
                  {
                    id: '1',
                    title: 'Pride and Prejudice',
                    author: 'Jane Austen',
                    genre: 'Classic',
                    publishYear: 1813,
                    language: 'English',
                    publicDomain: true,
                    createdAt: '2025-01-01'
                  },
                  {
                    id: '2',
                    title: 'The Adventures of Tom Sawyer',
                    author: 'Mark Twain',
                    genre: 'Fiction',
                    publishYear: 1876,
                    language: 'English',
                    publicDomain: true,
                    createdAt: '2025-01-01'
                  },
                  {
                    id: '3',
                    title: 'Frankenstein',
                    author: 'Mary Shelley',
                    genre: 'Science Fiction',
                    publishYear: 1818,
                    language: 'English',
                    publicDomain: true,
                    createdAt: '2025-01-01'
                  }
                ]).map((book, index) => {
                  // Genre-based color schemes
                  const genreColors = {
                    'Classic': {
                      gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      badge: '#8b5cf6',
                      badgeBg: '#f3e8ff'
                    },
                    'Fiction': {
                      gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                      badge: '#ec4899',
                      badgeBg: '#fdf2f8'
                    },
                    'Science Fiction': {
                      gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                      badge: '#0ea5e9',
                      badgeBg: '#e0f2fe'
                    }
                  };
                  
                  const colors = genreColors[book.genre as keyof typeof genreColors] || genreColors['Classic'];
                  
                  return (
                    <motion.div
                      key={book.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ 
                        delay: index * 0.1,
                        duration: 0.5,
                        ease: "easeOut"
                      }}
                      whileHover={{ 
                        y: -8,
                        transition: { duration: 0.2 }
                      }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleBookSelect(book)}
                      style={{
                        background: 'white',
                        borderRadius: '16px',
                        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05), 0 10px 20px rgba(0, 0, 0, 0.1)',
                        padding: '0',
                        cursor: 'pointer',
                        overflow: 'hidden',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        position: 'relative' as const,
                        width: '300px',
                        flexShrink: 0
                      }}
                    >
                      {/* Gradient Header */}
                      <div style={{
                        background: colors.gradient,
                        height: '80px',
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'flex-end',
                        padding: '16px'
                      }}>
                        <div style={{
                          position: 'absolute',
                          top: '12px',
                          right: '16px',
                          background: 'rgba(255, 255, 255, 0.2)',
                          backdropFilter: 'blur(10px)',
                          borderRadius: '20px',
                          padding: '4px 12px',
                          fontSize: '11px',
                          color: 'white',
                          fontWeight: '600',
                          textTransform: 'uppercase' as const,
                          letterSpacing: '0.5px'
                        }}>
                          {book.genre || 'Book'}
                        </div>
                      </div>

                      {/* Content */}
                      <div style={{ padding: '20px' }}>
                        <h3 style={{
                          fontSize: '20px',
                          fontWeight: '700',
                          marginBottom: '8px',
                          color: '#1a202c',
                          lineHeight: '1.3',
                          fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif'
                        }}>{book.title}</h3>
                        
                        <p style={{
                          color: '#4a5568',
                          marginBottom: '16px',
                          fontSize: '15px',
                          fontWeight: '500',
                          fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif'
                        }}>by {book.author}</p>

                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginTop: '16px'
                        }}>
                          {book.publishYear && (
                            <span style={{
                              color: '#718096',
                              fontSize: '13px',
                              fontWeight: '500',
                              backgroundColor: '#f7fafc',
                              padding: '4px 8px',
                              borderRadius: '6px'
                            }}>{book.publishYear}</span>
                          )}
                          
                          <motion.div
                            whileHover={{ scale: 1.1 }}
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '50%',
                              background: colors.gradient,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'white',
                              fontSize: '14px',
                              fontWeight: 'bold'
                            }}
                          >
                            →
                          </motion.div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* Enhanced Pagination */}
              {pagination.pages > 1 && (
                <motion.nav
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  aria-label="Pagination"
                  style={{ 
                    display: 'flex', 
                    justifyContent: 'center',
                    marginTop: '48px'
                  }}
                >
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <button
                      onClick={() => handlePageChange(pagination.page - 1)}
                      disabled={pagination.page === 1}
                      aria-label="Previous page"
                      style={{
                        padding: '12px 20px',
                        borderRadius: '12px',
                        border: '2px solid #e2e8f0',
                        backgroundColor: pagination.page === 1 ? '#f7fafc' : 'white',
                        color: pagination.page === 1 ? '#a0aec0' : '#4a5568',
                        fontSize: '14px',
                        fontWeight: '600',
                        fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                        cursor: pagination.page === 1 ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        if (pagination.page !== 1) {
                          e.currentTarget.style.borderColor = '#667eea';
                          e.currentTarget.style.backgroundColor = '#f8faff';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (pagination.page !== 1) {
                          e.currentTarget.style.borderColor = '#e2e8f0';
                          e.currentTarget.style.backgroundColor = 'white';
                        }
                      }}
                    >
                      ← Previous
                    </button>
                    
                    <span style={{
                      padding: '12px 20px',
                      fontSize: '14px',
                      fontWeight: '500',
                      color: '#4a5568',
                      fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                      backgroundColor: '#f7fafc',
                      borderRadius: '12px',
                      border: '2px solid #e2e8f0'
                    }}>
                      Page {pagination.page} of {pagination.pages}
                    </span>
                    
                    <button
                      onClick={() => handlePageChange(pagination.page + 1)}
                      disabled={pagination.page === pagination.pages}
                      aria-label="Next page"
                      style={{
                        padding: '12px 20px',
                        borderRadius: '12px',
                        border: '2px solid #e2e8f0',
                        backgroundColor: pagination.page === pagination.pages ? '#f7fafc' : 'white',
                        color: pagination.page === pagination.pages ? '#a0aec0' : '#4a5568',
                        fontSize: '14px',
                        fontWeight: '600',
                        fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                        cursor: pagination.page === pagination.pages ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        if (pagination.page !== pagination.pages) {
                          e.currentTarget.style.borderColor = '#667eea';
                          e.currentTarget.style.backgroundColor = '#f8faff';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (pagination.page !== pagination.pages) {
                          e.currentTarget.style.borderColor = '#e2e8f0';
                          e.currentTarget.style.backgroundColor = 'white';
                        }
                      }}
                    >
                      Next →
                    </button>
                  </div>
                </motion.nav>
              )}
            </>
          )}
        </AccessibleWrapper>
      )}
    </div>
    </div>
  );
}