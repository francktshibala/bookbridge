'use client';

import React, { useState, useEffect } from 'react';
import { AccessibleWrapper } from '@/components/AccessibleWrapper';
import { useAccessibility } from '@/contexts/AccessibilityContext';
import { AIChat } from '@/components/AIChat';

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
      <div className="max-w-6xl mx-auto">
        <AccessibleWrapper as="header" className="mb-6">
          <button
            onClick={handleBackToLibrary}
            className="btn-secondary mb-4"
            aria-label="Return to library"
          >
            ← Back to Library
          </button>
          
          <h1 className="text-3xl font-bold mb-2">{selectedBook.title}</h1>
          <p className="text-lg text-secondary mb-4">by {selectedBook.author}</p>
          
          {selectedBook.description && (
            <p className="text-gray-700 mb-4">{selectedBook.description}</p>
          )}
          
          <div className="flex gap-4 text-sm text-secondary">
            {selectedBook.genre && <span>Genre: {selectedBook.genre}</span>}
            {selectedBook.publishYear && <span>Published: {selectedBook.publishYear}</span>}
            <span>Language: {selectedBook.language}</span>
          </div>
        </AccessibleWrapper>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <AccessibleWrapper as="section" ariaLabelledBy="book-details-heading">
            <h2 id="book-details-heading" className="text-xl font-semibold mb-4">
              Book Details
            </h2>
            
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <div>
                <strong>Title:</strong> {selectedBook.title}
              </div>
              <div>
                <strong>Author:</strong> {selectedBook.author}
              </div>
              {selectedBook.genre && (
                <div>
                  <strong>Genre:</strong> {selectedBook.genre}
                </div>
              )}
              {selectedBook.publishYear && (
                <div>
                  <strong>Publication Year:</strong> {selectedBook.publishYear}
                </div>
              )}
              <div>
                <strong>Language:</strong> {selectedBook.language}
              </div>
              <div>
                <strong>Status:</strong> {selectedBook.publicDomain ? 'Public Domain' : 'Copyrighted'}
              </div>
            </div>
            
            <div className="mt-4">
              <a
                href={`/library/${selectedBook.id}/read`}
                className="btn-primary inline-block text-center"
                aria-label={`Read ${selectedBook.title}`}
              >
                📖 Read Book
              </a>
            </div>
          </AccessibleWrapper>

          <div>
            <h2 id="ai-chat-section" className="text-xl font-semibold mb-4">
              Ask AI About This Book
            </h2>
            
            <div className="border border-gray-200 rounded-lg p-4 bg-white min-h-[400px]">
              <AIChat
                bookId={selectedBook.id}
                bookTitle={selectedBook.title}
                bookContext={`Title: ${selectedBook.title}, Author: ${selectedBook.author}${selectedBook.description ? `, Description: ${selectedBook.description}` : ''}`}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <AccessibleWrapper as="header" className="mb-8">
        <h1 className="text-3xl font-bold mb-4">BookBridge Library</h1>
        <p className="text-lg text-secondary mb-6">
          Browse our collection of public domain books and start conversations with AI about them.
        </p>

        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search books by title, author, or genre..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-transparent"
            aria-label="Search books"
          />
          <button
            type="submit"
            className="btn-primary"
            disabled={loading}
          >
            Search
          </button>
        </form>
      </AccessibleWrapper>

      {error && (
        <AccessibleWrapper
          as="div"
          role="alert"
          ariaLive="assertive"
          className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6"
        >
          <div className="text-red-800">{error}</div>
          <button
            onClick={() => fetchBooks()}
            className="text-red-600 hover:text-red-800 text-sm mt-2 underline"
          >
            Try Again
          </button>
        </AccessibleWrapper>
      )}

      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-primary mx-auto mb-4"></div>
          <p>Loading books...</p>
        </div>
      ) : (
        <AccessibleWrapper as="main" ariaLabelledBy="books-list-heading">
          <div className="flex justify-between items-center mb-6">
            <h2 id="books-list-heading" className="text-xl font-semibold">
              {searchTerm ? `Search Results for "${searchTerm}"` : 'Available Books'}
            </h2>
            <span className="text-sm text-secondary">
              {pagination.total} book{pagination.total === 1 ? '' : 's'} total
            </span>
          </div>

          {books.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-secondary">
                {searchTerm ? 'No books found matching your search.' : 'No books available yet.'}
              </p>
              <a href="/upload" className="btn-primary mt-4">
                Upload a Book
              </a>
            </div>
          ) : (
            <>
              <div className="grid gap-4">
                {books.map((book) => (
                  <div
                    key={book.id}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => {
                      console.log('Click detected on book:', book.title);
                      handleBookSelect(book);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        console.log('Keyboard event detected on book:', book.title);
                        handleBookSelect(book);
                      }
                    }}
                    tabIndex={0}
                    role="button"
                    aria-label={`Select ${book.title} by ${book.author}`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold mb-1">{book.title}</h3>
                        <p className="text-secondary mb-2">by {book.author}</p>
                        
                        {book.description && (
                          <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                            {book.description}
                          </p>
                        )}
                        
                        <div className="flex gap-4 text-xs text-secondary">
                          {book.genre && <span>Genre: {book.genre}</span>}
                          {book.publishYear && <span>Published: {book.publishYear}</span>}
                          <span>Language: {book.language}</span>
                        </div>
                      </div>
                      
                      <div className="ml-4 flex-shrink-0">
                        <span className="inline-block bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
                          Public Domain
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {pagination.pages > 1 && (
                <AccessibleWrapper
                  as="nav"
                  ariaLabel="Pagination"
                  className="mt-8 flex justify-center"
                >
                  <div className="flex gap-2">
                    <button
                      onClick={() => handlePageChange(pagination.page - 1)}
                      disabled={pagination.page === 1}
                      className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                      aria-label="Previous page"
                    >
                      Previous
                    </button>
                    
                    <span className="px-4 py-2 text-sm">
                      Page {pagination.page} of {pagination.pages}
                    </span>
                    
                    <button
                      onClick={() => handlePageChange(pagination.page + 1)}
                      disabled={pagination.page === pagination.pages}
                      className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                      aria-label="Next page"
                    >
                      Next
                    </button>
                  </div>
                </AccessibleWrapper>
              )}
            </>
          )}
        </AccessibleWrapper>
      )}
    </div>
  );
}