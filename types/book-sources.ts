/**
 * Shared types for external book sources (Gutenberg, Open Library, etc.)
 */

// Source of the book
export type BookSource = 'gutenberg' | 'openlibrary' | 'standard-ebooks' | 'googlebooks';

// External book format - books from APIs
export interface ExternalBook {
  id: string;                    // Unique ID like 'gutenberg-123'
  title: string;                 // Book title
  author: string;                // Author name(s)
  coverUrl?: string;             // Cover image URL
  subjects: string[];            // Categories/genres
  language: string;              // Language code (e.g., 'en')
  source: BookSource;            // Which API it came from
  downloadUrl?: string;          // URL to fetch book content (optional for Google Books)
  popularity?: number;           // Download count or rating
  publicationYear?: number;      // Year published
  description?: string;          // Book description/summary
  downloadFormats?: Record<string, string>; // Available formats
  metadata?: {                   // Additional metadata for different sources
    publisher?: string;
    publishedDate?: string;
    pageCount?: number;
    averageRating?: number;
    ratingsCount?: number;
    previewLink?: string;
    infoLink?: string;
    isPreviewAvailable?: boolean;
    isPublicDomain?: boolean;
    isbn?: string;
  };
}

// Search parameters for book queries
export interface BookSearchParams {
  query?: string;                // Search term
  subject?: string;              // Filter by subject/genre
  author?: string;               // Filter by author
  language?: string;             // Filter by language
  page?: number;                 // Page number for pagination
  limit?: number;                // Results per page
  sort?: 'popular' | 'title' | 'recent';  // Sort order
}

// Search results with pagination
export interface BookSearchResults {
  books: ExternalBook[];         // Array of books
  totalCount: number;            // Total number of results
  page?: number;                 // Current page (optional)
  hasNextPage?: boolean;         // More results available (optional)
  hasPreviousPage?: boolean;     // Can go back (optional)
  hasMore?: boolean;             // Alternative to hasNextPage
}

// Book content after fetching
export interface BookContent {
  bookId: string;                // External book ID
  title: string;                 // Book title
  author: string;                // Author name
  content: string;               // Full text content
  chapters?: BookChapter[];      // Optional chapter breakdown
  metadata?: BookMetadata;       // Additional book info
}

// Chapter information
export interface BookChapter {
  id: string;                    // Chapter ID
  title: string;                 // Chapter title
  content: string;               // Chapter text
  startPosition: number;         // Character position in full text
  endPosition: number;           // End position
}

// Additional metadata
export interface BookMetadata {
  wordCount?: number;            // Total words
  readingTime?: number;          // Estimated minutes to read
  language?: string;             // Language code
  copyright?: string;            // Copyright information
  source?: BookSource;           // Where it came from
  originalPublicationDate?: string;  // When first published
}

// For the UI components
export interface BookCardProps {
  book: ExternalBook;
  onAnalyze: (book: ExternalBook) => void;
  isLoading?: boolean;
}

// For API responses
export interface ExternalBookApiResponse {
  success: boolean;
  data?: BookContent;
  error?: string;
}

// Cache entry for book content
export interface CachedBookContent {
  bookId: string;
  content: BookContent;
  cachedAt: Date;
  expiresAt: Date;
}

// User's interaction with external books
export interface ExternalBookInteraction {
  bookId: string;                // External book ID
  userId: string;                // User who analyzed it
  firstAccessedAt: Date;         // When they first opened it
  lastAccessedAt: Date;          // Most recent access
  chatSessionIds: string[];      // Related chat sessions
}