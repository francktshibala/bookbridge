'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { AIBookChatModal } from '@/lib/dynamic-imports';
import type { ExternalBook } from '@/types/book-sources';

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
  
  // AI Chat Modal State
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);
  const [selectedAIBook, setSelectedAIBook] = useState<ExternalBook | null>(null);

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
  const genres: string[] = books.length > 0 
    ? ['All', ...new Set(books.map(book => book.genre).filter(Boolean) as string[])]
    : ['All', 'Romance', 'Classic', 'Gothic', 'Adventure', 'American'];

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

  // AI Chat Handlers
  const handleAskAI = (book: Book) => {
    console.log('Enhanced Collection - Original book data:', book);
    
    // Convert Book to ExternalBook format for AI modal
    const externalBook: ExternalBook = {
      id: book.id,
      title: book.title,
      author: book.author,
      description: book.description || 'Enhanced ESL edition with multiple difficulty levels available',
      subjects: book.genre ? [book.genre] : ['Literature'],
      language: 'en',
      source: 'gutenberg',
      publicationYear: undefined,
      popularity: 1
    };
    
    console.log('Enhanced Collection - Converted ExternalBook:', externalBook);
    
    setSelectedAIBook(externalBook);
    setIsAIChatOpen(true);
  };

  const handleCloseAIChat = () => {
    setIsAIChatOpen(false);
    setSelectedAIBook(null);
  };

  const handleSendAIMessage = async (message: string): Promise<string> => {
    if (!selectedAIBook) {
      throw new Error('No book selected for AI chat');
    }

    try {
      const bookContext = `Title: ${selectedAIBook.title}, Author: ${selectedAIBook.author}${
        selectedAIBook.description ? `, Description: ${selectedAIBook.description}` : ''
      }${
        selectedAIBook.subjects?.length ? `, Subjects: ${selectedAIBook.subjects.join(', ')}` : ''
      }`;

      // Add timeout to prevent hanging - increased for complex AI analysis
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 90000); // 90 second timeout for complex AI processing

      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: message,
          bookId: selectedAIBook.id,
          bookContext: bookContext,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Enhanced Collection AI API Error Response:', errorData);
        console.error('Response status:', response.status);
        console.error('Request was:', {
          query: message,
          bookId: selectedAIBook.id,
          bookContext: bookContext
        });
        
        const errorMessage = errorData.error || errorData.message || `HTTP error! status: ${response.status}`;
        throw new Error(errorMessage);
      }

      const data = await response.json();
      
      // Return the full AI response data for progressive disclosure
      const aiResponse = {
        content: data.response || data.content || data.message || 'I received your question but had trouble generating a response. Please try again.',
        context: data.tutoringAgents?.context ? { content: data.tutoringAgents.context, confidence: 0.9 } : undefined,
        insights: data.tutoringAgents?.insights ? { content: data.tutoringAgents.insights, confidence: 0.9 } : undefined,
        questions: data.tutoringAgents?.questions ? { content: data.tutoringAgents.questions, confidence: 0.9 } : undefined,
        crossBookConnections: data.crossBookConnections,
        agentResponses: data.agentResponses,
        multiAgent: data.multiAgent
      };
      
      return JSON.stringify(aiResponse);
    } catch (error) {
      console.error('Error sending AI message:', error);
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error('⏱️ Request timed out after 90 seconds. Your AI analysis was too complex - try asking a simpler question or try again later.');
        }
        if (error.message.includes('limit exceeded') || error.message.includes('usage limit')) {
          throw new Error('You have reached your AI usage limit. Please upgrade your plan or try again later.');
        }
        if (error.message.includes('rate_limit_error') || error.message.includes('429')) {
          throw new Error('🚦 AI service is temporarily busy due to high usage. Please wait 1-2 minutes and try again.');
        }
        throw new Error(error.message);
      }
      
      throw new Error('Failed to get AI response. Please try again.');
    }
  };


  const BookCard = ({ book }: { book: Book }) => {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ scale: 1.01 }}
        style={{
          background: 'rgba(51, 65, 85, 0.5)',
          border: '1px solid #334155',
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '16px',
          width: '100%'
        }}
      >
        {/* Book Title */}
        <div style={{
          fontSize: '16px',
          fontWeight: '600',
          color: '#e2e8f0',
          marginBottom: '4px'
        }}>
          {book.title}
        </div>

        {/* Author */}
        <div style={{
          fontSize: '14px',
          color: '#94a3b8',
          marginBottom: '12px'
        }}>
          by {book.author}
        </div>

        {/* Meta Tags */}
        <div style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '12px',
          flexWrap: 'wrap'
        }}>
          <span style={{
            padding: '4px 8px',
            background: 'rgba(59, 130, 246, 0.2)',
            color: '#60a5fa',
            borderRadius: '4px',
            fontSize: '11px'
          }}>
            {book.cefrLevels}
          </span>
          <span style={{
            padding: '4px 8px',
            background: 'rgba(59, 130, 246, 0.2)',
            color: '#60a5fa',
            borderRadius: '4px',
            fontSize: '11px'
          }}>
            {book.genre}
          </span>
          <span style={{
            padding: '4px 8px',
            background: 'rgba(59, 130, 246, 0.2)',
            color: '#60a5fa',
            borderRadius: '4px',
            fontSize: '11px'
          }}>
            ~{book.estimatedHours}h
          </span>
          {book.status === 'enhanced' && (
            <span style={{
              padding: '4px 8px',
              background: 'rgba(16, 185, 129, 0.2)',
              color: '#10b981',
              borderRadius: '4px',
              fontSize: '11px'
            }}>
              Enhanced ⚡
            </span>
          )}
        </div>

        {/* Action Buttons */}
        <div style={{
          display: 'flex',
          gap: '8px'
        }}>
          <button
            onClick={() => handleAskAI(book)}
            style={{
              flex: 1,
              height: '36px',
              borderRadius: '8px',
              background: 'rgba(139, 92, 246, 0.2)',
              color: '#a78bfa',
              border: '1px solid rgba(139, 92, 246, 0.3)',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer'
            }}
          >
            Ask AI
          </button>
          <a
            href={`/library/${book.id}/read`}
            style={{
              flex: 1,
              height: '36px',
              background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '500',
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            {book.status === 'enhanced' ? 'Read Enhanced' : 'Read Original'}
          </a>
        </div>
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
          justifyContent: 'flex-start',
          marginTop: '32px',
          marginBottom: '40px',
          padding: '0 30px',
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch'
        }}>
          <div className="genre-filter-wrapper" style={{
            display: 'flex',
            gap: '12px',
            flexWrap: 'nowrap',
            justifyContent: 'flex-start',
            minWidth: 'max-content',
            padding: '30px 0'
          }}>
            {genres.map(genre => (
              <motion.button
                key={genre}
                onClick={() => handleGenreChange(genre)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                style={{
                  padding: '8px 20px',
                  background: selectedGenre === genre 
                    ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' 
                    : 'transparent',
                  border: `2px solid ${selectedGenre === genre ? 'transparent' : '#334155'}`,
                  borderRadius: '24px',
                  color: selectedGenre === genre ? 'white' : '#94a3b8',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  whiteSpace: 'nowrap',
                  minWidth: 'fit-content',
                  minHeight: '44px',
                  boxShadow: selectedGenre === genre ? '0 4px 12px rgba(102, 126, 234, 0.3)' : 'none',
                  flexShrink: 0
                }}
              >
                {genre} ({genre === 'All' ? books.length : books.filter(b => b.genre === genre).length})
              </motion.button>
            ))}
          </div>
        </div>

        
        {/* Responsive Styles */}
        <style jsx>{`
          .genre-filter-container {
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
          }
          .genre-filter-container::-webkit-scrollbar {
            height: 4px;
          }
          .genre-filter-container::-webkit-scrollbar-track {
            background: rgba(51, 65, 85, 0.3);
            border-radius: 2px;
          }
          .genre-filter-container::-webkit-scrollbar-thumb {
            background: rgba(102, 126, 234, 0.5);
            border-radius: 2px;
          }
          
          @media (min-width: 769px) {
            .enhanced-collection-grid {
              grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)) !important;
              max-width: 1200px !important;
              gap: 24px !important;
            }
          }
        `}</style>


        {/* Enhanced Books Section */}
        {enhancedBooks.length > 0 && (
          <>
            <div className="enhanced-collection-grid" style={{
                display: 'grid',
                gridTemplateColumns: '1fr',
                gap: '16px',
                maxWidth: '600px',
                margin: '0 auto',
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
            <h2 style={{ 
              fontSize: '24px', 
              marginBottom: '24px', 
              color: '#fbbf24',
              textAlign: 'center',
              maxWidth: '600px',
              margin: '0 auto 24px auto'
            }}>
              🔄 Currently Processing ({processingBooks.length})
            </h2>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr',
              gap: '16px',
              maxWidth: '600px',
              margin: '0 auto',
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
            <h2 style={{ 
              fontSize: '24px', 
              marginBottom: '24px', 
              color: '#9ca3af',
              textAlign: 'center',
              maxWidth: '600px',
              margin: '0 auto 24px auto'
            }}>
              📅 Planned for Enhancement ({plannedBooks.length})
            </h2>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr',
              gap: '16px',
              maxWidth: '600px',
              margin: '0 auto'
            }}>
              {plannedBooks.map((book) => (
                <BookCard key={book.id} book={book} />
              ))}
            </div>
          </>
        )}
      </div>

      {/* AI Chat Modal */}
      <AIBookChatModal
        isOpen={isAIChatOpen}
        book={selectedAIBook}
        onClose={handleCloseAIChat}
        onSendMessage={handleSendAIMessage}
      />
    </div>
  );
}