'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AccessibleWrapper } from '@/components/AccessibleWrapper';
import { useAccessibility } from '@/contexts/AccessibilityContext';
import { AIChat } from '@/components/AIChat';
import { motion } from 'framer-motion';
import { gutenbergAPI } from '@/lib/book-sources/gutenberg-api';
import { openLibraryAPI } from '@/lib/book-sources/openlibrary-api';
import { standardEbooksAPI } from '@/lib/book-sources/standardebooks-api';
import { CatalogBookCard } from '@/components/CatalogBookCard';
import { CatalogBookSkeleton } from '@/components/CatalogBookSkeleton';
import { RecommendationsSection } from '@/components/RecommendationsSection';
import { useBookViewTracking } from '@/lib/use-recommendations';
import { useAuth } from '@/components/SimpleAuthProvider';
import { ESLProgressWidget } from '@/components/esl/ESLProgressWidget';
import type { ExternalBook, BookSearchResults, BookSource } from '@/types/book-sources';

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
  // Simple auth check - no automatic redirects
  const { user, loading: authLoading } = useAuth();
  const { announceToScreenReader } = useAccessibility();
  const router = useRouter();
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [activeTab, setActiveTab] = useState<'my-books' | 'browse'>('browse'); // Default to browse
  const [catalogBooks, setCatalogBooks] = useState<ExternalBook[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [catalogPage, setCatalogPage] = useState(1);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogPagination, setCatalogPagination] = useState({
    hasNext: false,
    hasPrevious: false,
    total: 0
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  });
  const [selectedSource, setSelectedSource] = useState<'all' | BookSource>('all');
  const [authorFilter, setAuthorFilter] = useState('');
  const [genreFilter, setGenreFilter] = useState('');
  const [startYear, setStartYear] = useState('');
  const [endYear, setEndYear] = useState('');

  // Convert internal Book to ExternalBook for tracking
  const selectedExternalBook: ExternalBook | null = selectedBook ? {
    id: selectedBook.id,
    title: selectedBook.title,
    author: selectedBook.author,
    subjects: selectedBook.genre ? [selectedBook.genre] : [],
    language: selectedBook.language,
    source: selectedBook.id.includes('-') ? 
      selectedBook.id.split('-')[0] as BookSource : 'gutenberg',
    publicationYear: selectedBook.publishYear,
    description: selectedBook.description,
    popularity: 1
  } : null;

  // Track book viewing and get tracking functions
  const { trackAnalysis } = useBookViewTracking(selectedExternalBook);

  const fetchCatalogBooks = async (
    page: number = 1, 
    searchQuery: string = '', 
    source: 'all' | BookSource = 'all',
    filters: {
      author?: string;
      genre?: string;
      startYear?: string;
      endYear?: string;
    } = {}
  ) => {
    setCatalogLoading(true);
    setCatalogError(null);
    
    try {
      console.log('Fetching catalog books...', { page, searchQuery, source });
      
      let allResults: ExternalBook[] = [];
      let totalCount = 0;
      let hasNext = false;
      let hasPrevious = page > 1;
      
      if (source === 'all' || source === 'gutenberg') {
        try {
          const gutenbergResults = searchQuery.trim() 
            ? await gutenbergAPI.searchBooksStandard(searchQuery.trim(), page)
            : await gutenbergAPI.getPopularBooksStandard(page);
          
          if (source === 'gutenberg') {
            allResults = gutenbergResults.books;
            totalCount = gutenbergResults.totalCount;
            hasNext = gutenbergResults.hasNextPage || false;
          } else {
            allResults.push(...gutenbergResults.books);
            totalCount += gutenbergResults.totalCount;
            hasNext = hasNext || (gutenbergResults.hasNextPage || false);
          }
        } catch (error) {
          console.error('Error fetching from Gutenberg:', error);
        }
      }
      
      if (source === 'all' || source === 'openlibrary') {
        try {
          const openLibraryResults = searchQuery.trim()
            ? await openLibraryAPI.searchBooksStandard(searchQuery.trim(), page)
            : await openLibraryAPI.getPopularBooksStandard(page);
          
          if (source === 'openlibrary') {
            allResults = openLibraryResults.books;
            totalCount = openLibraryResults.totalCount;
            hasNext = openLibraryResults.hasNextPage || false;
          } else {
            allResults.push(...openLibraryResults.books);
            totalCount += openLibraryResults.totalCount;
            hasNext = hasNext || (openLibraryResults.hasNextPage || false);
          }
        } catch (error) {
          console.error('Error fetching from Open Library:', error);
        }
      }
      
      // Temporarily disable Standard Ebooks due to authentication requirements
      // Standard Ebooks now requires authentication which we don't have
      // The app works fine with Gutenberg + Open Library + Google Books
      /*
      if (source === 'all' || source === 'standard-ebooks') {
        try {
          const standardEbooksResults = searchQuery.trim()
            ? await standardEbooksAPI.searchBooksStandard(searchQuery.trim())
            : await standardEbooksAPI.getPopularBooksStandard();
          
          if (source === 'standard-ebooks') {
            allResults = standardEbooksResults.books;
            totalCount = standardEbooksResults.totalCount;
            hasNext = standardEbooksResults.hasNextPage || false;
          } else {
            allResults.push(...standardEbooksResults.books);
            totalCount += standardEbooksResults.totalCount;
            hasNext = hasNext || (standardEbooksResults.hasNextPage || false);
          }
        } catch (error) {
          console.error('Error fetching from Standard Ebooks:', error);
        }
      }
      */
      
      if (source === 'all' || source === 'googlebooks') {
        try {
          // Build advanced search query for Google Books
          let query = searchQuery.trim() || 'subject:fiction';
          
          // Add author filter
          if (filters.author) {
            query += ` inauthor:"${filters.author}"`;
          }
          
          // Add genre/subject filter
          if (filters.genre) {
            query += ` subject:"${filters.genre}"`;
          }
          
          const params = new URLSearchParams({
            q: query,
            page: page.toString(),
            limit: '40'
          });
          
          const response = await fetch(`/api/books/googlebooks/search?${params}`);
          const googleBooksResults = await response.json();
          
          if (response.ok) {
            let filteredBooks = googleBooksResults.books;
            
            // Client-side filtering for publication years
            if (filters.startYear || filters.endYear) {
              filteredBooks = filteredBooks.filter((book: ExternalBook) => {
                const pubDate = book.metadata?.publishedDate;
                if (!pubDate) return false;
                
                const pubYear = parseInt(pubDate.split('-')[0]);
                if (isNaN(pubYear)) return false;
                
                if (filters.startYear && pubYear < parseInt(filters.startYear)) return false;
                if (filters.endYear && pubYear > parseInt(filters.endYear)) return false;
                
                return true;
              });
            }
            
            if (source === 'googlebooks') {
              allResults = filteredBooks;
              totalCount = filteredBooks.length;
              hasNext = false; // Reset pagination for filtered results
            } else {
              allResults.push(...filteredBooks);
              totalCount += filteredBooks.length;
              hasNext = hasNext || googleBooksResults.hasMore || false;
            }
          } else {
            throw new Error(googleBooksResults.error || 'Failed to fetch Google Books');
          }
        } catch (error) {
          console.error('Error fetching from Google Books:', error);
          if (source === 'googlebooks') {
            setCatalogError('Failed to fetch Google Books. Please check your API key in .env.local file.');
          }
        }
      }
      
      // Sort combined results by popularity
      if (source === 'all') {
        allResults.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
      }
      
      setCatalogBooks(allResults);
      setCatalogPagination({
        hasNext,
        hasPrevious,
        total: totalCount
      });
      setCatalogPage(page);
      
      const sourceText = source === 'all' ? 'all sources' : source;
      const message = searchQuery 
        ? `Found ${allResults.length} books matching "${searchQuery}" from ${sourceText}`
        : `Loaded ${allResults.length} books from ${sourceText}`;
      announceToScreenReader(message);
      
      console.log('Catalog books loaded:', allResults.length, 'books from', sourceText);
      
    } catch (error) {
      console.error('Error fetching catalog books:', error);
      setCatalogError('Failed to load catalog books. Please try again.');
      announceToScreenReader('Error loading catalog books', 'assertive');
    } finally {
      setCatalogLoading(false);
    }
  };

  const handleCatalogSearch = () => {
    setCatalogPage(1);
    fetchCatalogBooks(1, catalogSearch, selectedSource, {
      author: authorFilter,
      genre: genreFilter,
      startYear: startYear,
      endYear: endYear
    });
  };

  // Don't return early - this violates Rules of Hooks
  // Instead, we'll handle auth loading in the render section

  // Helper function to render the My Books content
  const renderMyBooksContent = () => {
    if (loading) {
      return (
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
      );
    }

    return (
      <AccessibleWrapper as="main" ariaLabelledBy="books-list-heading">
        {/* My Books content goes here - I'll add this back */}
        <p>My Books content temporarily removed for syntax fix</p>
      </AccessibleWrapper>
    );
  };

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
  
  useEffect(() => {
    if (activeTab === 'browse' && catalogBooks.length === 0) {
      fetchCatalogBooks(1, '', 'all', {});
    }
  }, [activeTab]);

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
  
  const handleAnalyzeCatalogBook = (book: ExternalBook) => {
    console.log('Analyzing catalog book:', book);
    announceToScreenReader(`Opening ${book.title} by ${book.author}`);
    // Navigate to the book detail page instead of updating state
    router.push(`/library/${book.id}`);
  };

  if (selectedBook) {
    return (
      <div className="page-container magical-bg">
        <div className="page-content">
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

            {/* Recommendations Section */}
            {selectedExternalBook && (
              <RecommendationsSection
                targetBook={selectedExternalBook}
                onAnalyzeBook={(book) => {
                  // Convert ExternalBook back to internal Book format
                  const internalBook: Book = {
                    id: book.id,
                    title: book.title,
                    author: book.author,
                    description: book.description,
                    genre: book.subjects[0] || 'Literature',
                    publishYear: book.publicationYear,
                    language: book.language,
                    publicDomain: true,
                    createdAt: new Date().toISOString()
                  };
                  
                  setSelectedBook(internalBook);
                  announceToScreenReader(`Selected recommended book: ${book.title} by ${book.author}`);
                }}
                maxRecommendations={6}
              />
            )}
          </motion.div>
        </div>
      </div>
    );
  }

  // Show auth loading screen
  if (authLoading) {
    return (
      <AccessibleWrapper>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-600 mx-auto mb-4"></div>
            <p className="text-slate-600 dark:text-slate-400">Loading...</p>
          </div>
        </div>
      </AccessibleWrapper>
    );
  }

  // Show login prompt for unauthenticated users (no automatic redirect)
  if (!user) {
    return (
      <AccessibleWrapper>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-4">
              Please Sign In
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              You need to sign in to access your book library.
            </p>
            <a 
              href="/auth/login" 
              className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors"
            >
              Sign In
            </a>
          </div>
        </div>
      </AccessibleWrapper>
    );
  }

  return (
    <div className="page-container magical-bg" style={{ minHeight: '100vh' }}>
      <div className="page-content" style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 24px' }}>
        {/* Magical Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          style={{
            textAlign: 'center',
            padding: '80px 0 60px 0',
            background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 50%, rgba(240, 147, 251, 0.1) 100%)',
            borderRadius: '32px',
            marginBottom: '48px',
            border: '1px solid var(--border-light)',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          {/* Floating particles background */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundImage: 'radial-gradient(circle at 25% 25%, rgba(102, 126, 234, 0.3) 0%, transparent 50%), radial-gradient(circle at 75% 75%, rgba(240, 147, 251, 0.3) 0%, transparent 50%)',
            pointerEvents: 'none'
          }} />
          
          <AccessibleWrapper as="header" style={{ position: 'relative', zIndex: 1 }}>
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="text-gradient page-title" 
              style={{ 
                fontSize: '4.5rem', 
                letterSpacing: '-0.02em',
                marginBottom: '24px',
                fontWeight: '900',
                lineHeight: '1.1'
              }}
            >
              📚 Discover Literary Magic
            </motion.h1>
            
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              style={{
                fontSize: '1.3rem',
                color: 'var(--text-secondary)',
                fontWeight: '500',
                fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                marginBottom: '40px',
                maxWidth: '700px',
                margin: '0 auto 40px auto',
                lineHeight: '1.6'
              }}
            >
              Explore 20M+ classic books with AI-powered insights. From Gutenberg to Google Books - your literary journey starts here.
            </motion.p>

            {/* Elegant Tab Navigation */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.6 }}
              style={{
                display: 'flex',
                justifyContent: 'center',
                gap: '12px',
                background: 'rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(20px)',
                borderRadius: '20px',
                padding: '8px',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
              }}
            >
              <motion.button
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  setActiveTab('my-books');
                  announceToScreenReader('Switched to My Books tab');
                }}
                style={{
                  padding: '16px 32px',
                  borderRadius: '16px',
                  fontSize: '1.1rem',
                  fontWeight: '700',
                  fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                  cursor: 'pointer',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  background: activeTab === 'my-books' 
                    ? 'linear-gradient(135deg, var(--brand-primary) 0%, var(--brand-secondary) 100%)' 
                    : 'transparent',
                  color: activeTab === 'my-books' ? '#ffffff' : 'var(--text-secondary)',
                  boxShadow: activeTab === 'my-books' 
                    ? '0 8px 25px rgba(102, 126, 234, 0.4)' 
                    : 'none',
                  border: 'none',
                  transform: activeTab === 'my-books' ? 'translateY(-2px)' : 'translateY(0)'
                }}
              >
                📚 My Collection
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  setActiveTab('browse');
                  announceToScreenReader('Switched to Browse Catalog tab');
                }}
                style={{
                  padding: '16px 32px',
                  borderRadius: '16px',
                  fontSize: '1.1rem',
                  fontWeight: '700',
                  fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                  cursor: 'pointer',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  background: activeTab === 'browse' 
                    ? 'linear-gradient(135deg, var(--brand-primary) 0%, var(--brand-secondary) 100%)' 
                    : 'transparent',
                  color: activeTab === 'browse' ? '#ffffff' : 'var(--text-secondary)',
                  boxShadow: activeTab === 'browse' 
                    ? '0 8px 25px rgba(102, 126, 234, 0.4)' 
                    : 'none',
                  border: 'none',
                  transform: activeTab === 'browse' ? 'translateY(-2px)' : 'translateY(0)'
                }}
              >
                🌟 Discover Books
              </motion.button>
            </motion.div>
          </AccessibleWrapper>
        </motion.div>

        {/* ESL Progress Widget */}
        <ESLProgressWidget />

        {activeTab === 'my-books' ? (
          <>
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
            {renderMyBooksContent()}
          </>
        ) : (
        // Browse Catalog Tab Content
        <AccessibleWrapper as="main" ariaLabelledBy="catalog-heading">
          {/* General Recommendations Section */}
          <RecommendationsSection
            onAnalyzeBook={handleAnalyzeCatalogBook}
            title="✨ Discover Popular Books"
            subtitle="Books that readers love - start here to explore our collection"
            maxRecommendations={6}
          />
          {/* Elegant Section Header */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            style={{
              textAlign: 'center',
              marginBottom: '48px',
              padding: '40px 32px',
              background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.08) 0%, rgba(240, 147, 251, 0.08) 100%)',
              borderRadius: '24px',
              border: '1px solid var(--border-light)',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            {/* Decorative elements */}
            <div style={{
              position: 'absolute',
              top: '-50%',
              left: '-50%',
              width: '200%',
              height: '200%',
              background: 'radial-gradient(circle, rgba(102, 126, 234, 0.1) 0%, transparent 70%)',
              animation: 'float 6s ease-in-out infinite',
              pointerEvents: 'none'
            }} />
            
            <motion.h2 
              id="catalog-heading"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              style={{
                fontSize: '3rem',
                fontWeight: '900',
                background: 'linear-gradient(135deg, var(--brand-primary) 0%, var(--brand-secondary) 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                margin: '0 0 16px 0',
                letterSpacing: '-0.02em',
                position: 'relative',
                zIndex: 1
              }}
            >
              ✨ Explore Literary Treasures
            </motion.h2>
            
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              style={{
                fontSize: '1.1rem',
                color: 'var(--text-secondary)',
                fontWeight: '500',
                maxWidth: '600px',
                margin: '0 auto',
                lineHeight: '1.6',
                position: 'relative',
                zIndex: 1
              }}
            >
              Browse through millions of classic books from renowned sources. Find your next literary adventure with AI-powered recommendations.
            </motion.p>
            {catalogPagination.total > 0 && (
              <motion.span 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                style={{
                  fontSize: 'var(--text-sm)',
                  color: 'var(--text-secondary)',
                  fontWeight: '500',
                  fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                  backgroundColor: 'var(--surface-subtle)',
                  padding: '6px 12px',
                  borderRadius: '20px'
                }}
              >
                {catalogPagination.total.toLocaleString()}+ books available
              </motion.span>
            )}
          </motion.div>

          {/* Catalog Search Controls */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            style={{ marginBottom: '32px' }}
          >
            <div style={{ 
              display: 'flex', 
              gap: '12px',
              flexWrap: 'wrap',
              alignItems: 'center',
              marginBottom: '16px'
            }}>
              <div style={{ flex: '1', minWidth: '300px' }}>
                <input
                  type="text"
                  value={catalogSearch}
                  onChange={(e) => setCatalogSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleCatalogSearch();
                    }
                  }}
                  placeholder="Search classic books by title or author..."
                  style={{
                    width: '100%',
                    padding: '12px 16px',
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
                />
              </div>
              
              {/* Source Filter Dropdown */}
              <select
                value={selectedSource}
                onChange={(e) => {
                  const newSource = e.target.value as 'all' | BookSource;
                  setSelectedSource(newSource);
                  fetchCatalogBooks(1, catalogSearch, newSource, {
                    author: authorFilter,
                    genre: genreFilter,
                    startYear: startYear,
                    endYear: endYear
                  });
                }}
                style={{
                  padding: '12px 16px',
                  border: '2px solid #e2e8f0',
                  borderRadius: '12px',
                  fontSize: '16px',
                  fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                  fontWeight: '500',
                  color: '#2d3748',
                  backgroundColor: 'white',
                  outline: 'none',
                  cursor: 'pointer',
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
                aria-label="Filter by book source"
              >
                <option value="all">📚 All Sources</option>
                <option value="gutenberg">📖 Project Gutenberg (76K+)</option>
                <option value="openlibrary">🌍 Open Library (1.4M+)</option>
                {/* <option value="standard-ebooks">✨ Standard Ebooks (500+)</option> */}
                <option value="googlebooks">🔍 Google Books (20M+)</option>
              </select>
              
              {/* Advanced Filters */}
              <div style={{
                display: 'flex',
                gap: '12px',
                flexWrap: 'wrap',
                alignItems: 'center',
                padding: '12px',
                backgroundColor: '#f8fafc',
                borderRadius: '12px',
                border: '1px solid #e2e8f0'
              }}>
                <span style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#4a5568',
                  fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif'
                }}>
                  🔍 Filters:
                </span>
                
                {/* Author Filter */}
                <input
                  type="text"
                  value={authorFilter}
                  onChange={(e) => setAuthorFilter(e.target.value)}
                  placeholder="Author name..."
                  style={{
                    padding: '8px 12px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                    color: '#374151',
                    backgroundColor: 'white',
                    outline: 'none',
                    minWidth: '120px',
                    transition: 'all 0.2s ease'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#667eea';
                    e.target.style.boxShadow = '0 0 0 2px rgba(102, 126, 234, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#e2e8f0';
                    e.target.style.boxShadow = 'none';
                  }}
                />
                
                {/* Genre Filter */}
                <select
                  value={genreFilter}
                  onChange={(e) => setGenreFilter(e.target.value)}
                  style={{
                    padding: '8px 12px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                    color: '#374151',
                    backgroundColor: 'white',
                    outline: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#667eea';
                    e.target.style.boxShadow = '0 0 0 2px rgba(102, 126, 234, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#e2e8f0';
                    e.target.style.boxShadow = 'none';
                  }}
                >
                  <option value="">All Genres</option>
                  <option value="fiction">Fiction</option>
                  <option value="science fiction">Science Fiction</option>
                  <option value="fantasy">Fantasy</option>
                  <option value="mystery">Mystery</option>
                  <option value="romance">Romance</option>
                  <option value="history">History</option>
                  <option value="biography">Biography</option>
                  <option value="philosophy">Philosophy</option>
                  <option value="poetry">Poetry</option>
                  <option value="drama">Drama</option>
                  <option value="children">Children's Books</option>
                  <option value="young adult">Young Adult</option>
                </select>
                
                {/* Publication Year Range */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="number"
                    value={startYear}
                    onChange={(e) => setStartYear(e.target.value)}
                    placeholder="From year"
                    min="1800"
                    max="2024"
                    style={{
                      padding: '8px 12px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                      color: '#374151',
                      backgroundColor: 'white',
                      outline: 'none',
                      width: '90px',
                      transition: 'all 0.2s ease'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#667eea';
                      e.target.style.boxShadow = '0 0 0 2px rgba(102, 126, 234, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#e2e8f0';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                  <span style={{ color: '#6b7280', fontSize: '14px' }}>-</span>
                  <input
                    type="number"
                    value={endYear}
                    onChange={(e) => setEndYear(e.target.value)}
                    placeholder="To year"
                    min="1800"
                    max="2024"
                    style={{
                      padding: '8px 12px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                      color: '#374151',
                      backgroundColor: 'white',
                      outline: 'none',
                      width: '90px',
                      transition: 'all 0.2s ease'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#667eea';
                      e.target.style.boxShadow = '0 0 0 2px rgba(102, 126, 234, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#e2e8f0';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </div>
                
                {/* Clear Filters Button */}
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    setAuthorFilter('');
                    setGenreFilter('');
                    setStartYear('');
                    setEndYear('');
                    setCatalogPage(1);
                    fetchCatalogBooks(1, catalogSearch, selectedSource);
                  }}
                  style={{
                    padding: '8px 12px',
                    backgroundColor: '#f1f5f9',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: '500',
                    color: '#475569',
                    cursor: 'pointer',
                    fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                    transition: 'all 0.2s ease'
                  }}
                >
                  Clear Filters
                </motion.button>
              </div>
              
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleCatalogSearch}
                disabled={catalogLoading}
                style={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '12px 20px',
                  fontSize: '16px',
                  fontWeight: '600',
                  fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                  cursor: catalogLoading ? 'not-allowed' : 'pointer',
                  opacity: catalogLoading ? 0.7 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)',
                  transition: 'all 0.2s ease'
                }}
              >
                🔍 Search
              </motion.button>
              
              {catalogSearch && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    setCatalogSearch('');
                    setAuthorFilter('');
                    setGenreFilter('');
                    setStartYear('');
                    setEndYear('');
                    setCatalogPage(1);
                    fetchCatalogBooks(1, '', selectedSource);
                  }}
                  style={{
                    background: 'white',
                    color: '#718096',
                    border: '2px solid #e2e8f0',
                    borderRadius: '12px',
                    padding: '12px 16px',
                    fontSize: '14px',
                    fontWeight: '600',
                    fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#cbd5e0';
                    e.currentTarget.style.backgroundColor = '#f7fafc';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#e2e8f0';
                    e.currentTarget.style.backgroundColor = 'white';
                  }}
                >
                  ✕ Clear
                </motion.button>
              )}
            </div>
            
            {/* Search Results Info */}
            {catalogSearch && catalogPagination.total >= 0 && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                style={{
                  fontSize: '14px',
                  color: '#718096',
                  fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                  margin: 0,
                  textAlign: 'center'
                }}
              >
                {catalogPagination.total === 0 
                  ? `No results found for "${catalogSearch}"`
                  : `Found ${catalogPagination.total.toLocaleString()} results for "${catalogSearch}"`
                }
              </motion.p>
            )}
          </motion.div>

          {/* Error State */}
          {catalogError && (
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
              }}>{catalogError}</div>
              <button
                onClick={() => fetchCatalogBooks(catalogPage)}
                style={{
                  color: '#c53030',
                  fontSize: '14px',
                  fontWeight: '600',
                  fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                  background: 'none',
                  border: 'none',
                  textDecoration: 'underline',
                  cursor: 'pointer'
                }}
              >
                Try Again
              </button>
            </motion.div>
          )}

          {/* Loading State */}
          {catalogLoading ? (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
              gap: '32px',
              justifyItems: 'center',
              marginBottom: '48px',
              padding: '0 12px'
            }}>
              {Array.from({ length: 12 }, (_, index) => (
                <CatalogBookSkeleton key={index} index={index} />
              ))}
            </div>
          ) : catalogBooks.length === 0 ? (
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
                fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif'
              }}>
                No books found in catalog.
              </p>
            </motion.div>
          ) : (
            <>
              {/* Magical Books Grid */}
              <motion.div 
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
                  gap: '32px',
                  justifyItems: 'center',
                  marginBottom: '48px',
                  padding: '0 12px'
                }}
              >
                {catalogBooks.map((book, index) => (
                  <CatalogBookCard
                    key={book.id}
                    book={book}
                    onAnalyze={handleAnalyzeCatalogBook}
                    index={index}
                  />
                ))}
              </motion.div>

              {/* Pagination */}
              {(catalogPagination.hasNext || catalogPagination.hasPrevious) && (
                <motion.nav
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  aria-label="Catalog pagination"
                  style={{ 
                    display: 'flex', 
                    justifyContent: 'center',
                    marginTop: '48px'
                  }}
                >
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <button
                      onClick={() => fetchCatalogBooks(catalogPage - 1, catalogSearch, selectedSource, {
                        author: authorFilter,
                        genre: genreFilter,
                        startYear: startYear,
                        endYear: endYear
                      })}
                      disabled={!catalogPagination.hasPrevious || catalogLoading}
                      aria-label="Previous page"
                      style={{
                        padding: '12px 20px',
                        borderRadius: '12px',
                        border: '2px solid #e2e8f0',
                        backgroundColor: !catalogPagination.hasPrevious ? '#f7fafc' : 'white',
                        color: !catalogPagination.hasPrevious ? '#a0aec0' : '#4a5568',
                        fontSize: '14px',
                        fontWeight: '600',
                        fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                        cursor: !catalogPagination.hasPrevious ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s ease'
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
                      Page {catalogPage}
                    </span>
                    
                    <button
                      onClick={() => fetchCatalogBooks(catalogPage + 1, catalogSearch, selectedSource, {
                        author: authorFilter,
                        genre: genreFilter,
                        startYear: startYear,
                        endYear: endYear
                      })}
                      disabled={!catalogPagination.hasNext || catalogLoading}
                      aria-label="Next page"
                      style={{
                        padding: '12px 20px',
                        borderRadius: '12px',
                        border: '2px solid #e2e8f0',
                        backgroundColor: !catalogPagination.hasNext ? '#f7fafc' : 'white',
                        color: !catalogPagination.hasNext ? '#a0aec0' : '#4a5568',
                        fontSize: '14px',
                        fontWeight: '600',
                        fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                        cursor: !catalogPagination.hasNext ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s ease'
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