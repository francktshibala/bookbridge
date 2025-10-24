'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { AIBookChatModal } from '@/lib/dynamic-imports';
import { DownloadButton } from '@/components/offline/DownloadButton';
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
    icon: '📚',
    title: 'Vocabulary Builder',
    description: 'Interactive word definitions'
  },
  {
    icon: '📊',
    title: 'Progress Tracking',
    description: 'Reading analytics & comprehension'
  },
  {
    icon: '📖',
    title: 'Academic Reading',
    description: 'Focus on text comprehension'
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
        whileHover={{ y: -4 }}
        className="bg-[var(--bg-secondary)] border border-[var(--accent-secondary)] rounded-xl p-4 flex flex-col shadow-sm hover:shadow-md transition-all duration-200"
        style={{
          height: '240px',
          width: '320px',
          boxShadow: '0 2px 8px var(--shadow-soft)',
          cursor: 'pointer'
        }}
      >
        {/* Card Content */}
        <div>
          {/* Book Title */}
          <div className="text-lg font-bold text-[var(--text-accent)] mb-1 leading-tight" style={{ fontFamily: 'Playfair Display, serif' }}>
            {book.title}
          </div>
          {/* Author */}
          <div className="text-sm text-[var(--text-secondary)] mb-3" style={{ fontFamily: 'Source Serif Pro, serif' }}>
            by {book.author}
          </div>
          {/* Meta Tags - Compact Style */}
          <div className="flex gap-2 mb-3 flex-wrap">
            <span className="px-2 py-1 bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] border border-[var(--accent-primary)]/30 rounded-full text-xs font-medium">
              {book.cefrLevels}
            </span>
            <span className="px-2 py-1 bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] border border-[var(--accent-primary)]/30 rounded-full text-xs font-medium">
              {book.genre}
            </span>
            <span className="px-2 py-1 bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] border border-[var(--accent-primary)]/30 rounded-full text-xs font-medium">
              ~{book.estimatedHours}h
            </span>
            {book.status === 'enhanced' && (
              <span className="px-2 py-1 bg-green-500/10 text-green-600 border border-green-500/30 rounded-full text-xs font-medium">
                Enhanced ⚡
              </span>
            )}
          </div>

          {/* Download Button - Compact */}
          <div className="mb-2">
            <DownloadButton
              bookId={book.id}
              level={book.availableLevels?.[0] || 'A1'}
              compact={true}
            />
          </div>

          {/* Action Buttons - Compact Style */}
          <div className="flex gap-2 mt-auto">
            <button
              onClick={() => handleAskAI(book)}
              className="flex-1 h-9 rounded-lg bg-transparent text-[var(--accent-primary)] border border-[var(--accent-primary)]/30 hover:bg-[var(--accent-primary)]/10 hover:border-[var(--accent-primary)]/60 transition-all duration-200 text-sm font-medium"
              style={{ fontFamily: 'Source Serif Pro, serif' }}
            >
              Ask AI
            </button>
            <a
              href={`/library/${book.id}/read`}
              className="flex-1 h-9 bg-[var(--accent-primary)] text-[var(--bg-primary)] hover:bg-[var(--accent-secondary)] rounded-lg text-sm font-semibold transition-all duration-200 shadow-md hover:shadow-lg flex items-center justify-center no-underline"
              style={{ fontFamily: 'Source Serif Pro, serif' }}
            >
              Start Reading
            </a>
          </div>
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
          <p className="text-lg text-[var(--text-secondary)]" style={{ fontFamily: 'Source Serif Pro, serif' }}>Loading enhanced collection...</p>
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
          <p className="text-lg text-red-500" style={{ fontFamily: 'Source Serif Pro, serif' }}>{error}</p>
          <button
            onClick={fetchEnhancedBooks}
            className="mt-5 px-6 py-3 bg-[var(--accent-primary)] text-[var(--bg-primary)] rounded-lg font-semibold cursor-pointer hover:bg-[var(--accent-secondary)] transition-all"
            style={{ fontFamily: 'Source Serif Pro, serif' }}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]" style={{ padding: '40px 20px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="enhanced-collection-mobile-header"
          style={{ textAlign: 'center', marginBottom: '60px' }}
        >
          <h1 className="text-4xl font-bold mb-4 text-[var(--text-accent)]" style={{ fontFamily: 'Playfair Display, serif' }}>
            ✨ Enhanced Collection
          </h1>
          <p className="text-lg text-[var(--text-secondary)]" style={{ fontFamily: 'Source Serif Pro, serif' }}>
            Classic literature with AI-powered text simplification and vocabulary learning
          </p>
          <p className="text-sm text-[var(--text-secondary)] mt-2" style={{ fontFamily: 'Source Serif Pro, serif' }}>
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
                className={`px-5 py-2 rounded-full font-semibold cursor-pointer transition-all whitespace-nowrap min-w-fit min-h-[44px] flex-shrink-0 ${
                  selectedGenre === genre
                    ? 'bg-[var(--accent-primary)] text-[var(--bg-primary)] shadow-lg'
                    : 'bg-transparent text-[var(--text-secondary)] border-2 border-[var(--border-light)] hover:bg-[var(--accent-primary)]/10 hover:text-[var(--accent-primary)]'
                }`}
                style={{ fontFamily: 'Source Serif Pro, serif' }}
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
            background: var(--bg-secondary);
            border-radius: 2px;
          }
          .genre-filter-container::-webkit-scrollbar-thumb {
            background: var(--accent-primary);
            border-radius: 2px;
          }

          /* Centered, smaller cards grid to match wireframe */
          .enhanced-collection-grid {
            display: grid;
            grid-template-columns: repeat(3, 320px);
            gap: 28px;
            justify-content: center;
            max-width: none;
            padding: 0;
          }
          @media (max-width: 1100px) {
            .enhanced-collection-grid { grid-template-columns: repeat(2, 320px); }
          }
          @media (max-width: 740px) {
            .enhanced-collection-grid { grid-template-columns: repeat(1, 320px); }
          }
        `}</style>


        {/* Enhanced Books Section */}
        {enhancedBooks.length > 0 && (
          <>
            <div className="enhanced-collection-grid mx-auto" style={{
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
                    className="px-6 py-3 rounded-lg border-2 border-[var(--accent-primary)] bg-transparent text-[var(--accent-primary)] text-base font-semibold cursor-pointer transition-all hover:bg-[var(--accent-primary)] hover:text-[var(--bg-primary)]"
                    style={{ fontFamily: 'Source Serif Pro, serif' }}
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
            <h2 className="text-2xl font-semibold mb-6 text-yellow-500 text-center mx-auto max-w-[600px]" style={{ fontFamily: 'Playfair Display, serif' }}>
              🔄 Currently Processing ({processingBooks.length})
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto px-4 mb-16">
              {processingBooks.map((book) => (
                <BookCard key={book.id} book={book} />
              ))}
            </div>
          </>
        )}

        {/* Planned Books Section */}
        {plannedBooks.length > 0 && (
          <>
            <h2 className="text-2xl font-semibold mb-6 text-[var(--text-secondary)] text-center mx-auto max-w-[600px]" style={{ fontFamily: 'Playfair Display, serif' }}>
              📅 Planned for Enhancement ({plannedBooks.length})
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto px-4">
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