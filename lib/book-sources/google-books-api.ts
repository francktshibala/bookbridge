/**
 * Google Books API Service
 * Uses Google Books API to fetch book metadata and previews
 * API Documentation: https://developers.google.com/books/docs/v1/using
 */

// Google Books API Response Types
export interface GoogleBookVolume {
  kind: string;
  id: string;
  etag: string;
  selfLink: string;
  volumeInfo: {
    title: string;
    subtitle?: string;
    authors?: string[];
    publisher?: string;
    publishedDate?: string;
    description?: string;
    industryIdentifiers?: Array<{
      type: string;
      identifier: string;
    }>;
    readingModes?: {
      text: boolean;
      image: boolean;
    };
    pageCount?: number;
    printType?: string;
    categories?: string[];
    averageRating?: number;
    ratingsCount?: number;
    maturityRating?: string;
    allowAnonLogging?: boolean;
    contentVersion?: string;
    language?: string;
    previewLink?: string;
    infoLink?: string;
    canonicalVolumeLink?: string;
    imageLinks?: {
      smallThumbnail?: string;
      thumbnail?: string;
      small?: string;
      medium?: string;
      large?: string;
      extraLarge?: string;
    };
  };
  saleInfo?: {
    country?: string;
    saleability?: string;
    isEbook?: boolean;
    listPrice?: {
      amount: number;
      currencyCode: string;
    };
    retailPrice?: {
      amount: number;
      currencyCode: string;
    };
    buyLink?: string;
  };
  accessInfo?: {
    country?: string;
    viewability?: string;
    embeddable?: boolean;
    publicDomain?: boolean;
    textToSpeechPermission?: string;
    epub?: {
      isAvailable: boolean;
      acsTokenLink?: string;
    };
    pdf?: {
      isAvailable: boolean;
      acsTokenLink?: string;
    };
    webReaderLink?: string;
    accessViewStatus?: string;
    quoteSharingAllowed?: boolean;
  };
  searchInfo?: {
    textSnippet?: string;
  };
}

export interface GoogleBooksSearchResponse {
  kind: string;
  totalItems: number;
  items?: GoogleBookVolume[];
}

// Import our shared types
import type { ExternalBook, BookSearchResults } from '../../types/book-sources';

class GoogleBooksAPI {
  private baseUrl = 'https://www.googleapis.com/books/v1';
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.GOOGLE_BOOKS_API_KEY || '';
    if (!this.apiKey) {
      console.warn('Google Books API key not found. Please set GOOGLE_BOOKS_API_KEY in your .env.local file');
    }
  }

  /**
   * Convert Google Books volume to our ExternalBook format
   */
  private convertToExternalBook(volume: GoogleBookVolume): ExternalBook {
    const info = volume.volumeInfo;
    const access = volume.accessInfo;
    
    return {
      id: `googlebooks-${volume.id}`,
      source: 'googlebooks',
      title: info.title || 'Unknown Title',
      author: info.authors?.join(', ') || 'Unknown Author',
      coverUrl: info.imageLinks?.thumbnail || info.imageLinks?.smallThumbnail || undefined,
      language: info.language || 'en',
      subjects: info.categories || [],
      downloadFormats: {},
      metadata: {
        publisher: info.publisher,
        publishedDate: info.publishedDate,
        pageCount: info.pageCount,
        averageRating: info.averageRating,
        ratingsCount: info.ratingsCount,
        previewLink: info.previewLink,
        infoLink: info.infoLink,
        isPreviewAvailable: access?.viewability !== 'NO_PAGES',
        isPublicDomain: access?.publicDomain || false,
        isbn: info.industryIdentifiers?.find(id => id.type === 'ISBN_13')?.identifier ||
              info.industryIdentifiers?.find(id => id.type === 'ISBN_10')?.identifier
      }
    };
  }

  /**
   * Search for books using Google Books API
   */
  async searchBooks(query: string, page: number = 1, limit: number = 40): Promise<BookSearchResults> {
    try {
      if (!this.apiKey) {
        throw new Error('Google Books API key is required');
      }

      const startIndex = (page - 1) * limit;
      const params = new URLSearchParams({
        q: query || 'subject:fiction', // Default to fiction if no query
        startIndex: startIndex.toString(),
        maxResults: Math.min(limit, 40).toString(), // Google Books max is 40
        orderBy: 'relevance',
        key: this.apiKey
      });

      const response = await fetch(`${this.baseUrl}/volumes?${params}`);
      
      if (!response.ok) {
        throw new Error(`Google Books API error: ${response.status} ${response.statusText}`);
      }

      const data: GoogleBooksSearchResponse = await response.json();

      // Convert to our format
      const books = (data.items || []).map(volume => this.convertToExternalBook(volume));

      return {
        books,
        totalCount: data.totalItems || 0,
        hasMore: startIndex + books.length < (data.totalItems || 0)
      };
    } catch (error) {
      console.error('Error searching Google Books:', error);
      return { books: [], totalCount: 0, hasMore: false };
    }
  }

  /**
   * Get a single book by ID
   */
  async getBook(id: string): Promise<ExternalBook | null> {
    try {
      if (!this.apiKey) {
        throw new Error('Google Books API key is required');
      }

      // Remove our prefix if present
      const volumeId = id.startsWith('googlebooks-') ? id.slice(12) : id;
      
      const params = new URLSearchParams({ key: this.apiKey });
      const response = await fetch(`${this.baseUrl}/volumes/${volumeId}?${params}`);
      
      if (!response.ok) {
        return null;
      }

      const volume: GoogleBookVolume = await response.json();
      return this.convertToExternalBook(volume);
    } catch (error) {
      console.error('Error fetching Google Books volume:', error);
      return null;
    }
  }

  /**
   * Get preview content for a book
   * Note: This will only return limited preview text based on what Google provides
   */
  async getPreviewContent(id: string): Promise<string | null> {
    try {
      const book = await this.getBook(id);
      if (!book || !book.metadata?.previewLink) {
        return null;
      }

      // Google Books doesn't provide full text via API
      // We can only return metadata and description for AI analysis
      const content = `
Title: ${book.title}
Author: ${book.author}
Published: ${book.metadata.publishedDate || 'Unknown'}
Publisher: ${book.metadata.publisher || 'Unknown'}
Pages: ${book.metadata.pageCount || 'Unknown'}

Description:
${book.description || 'No description available.'}

Categories: ${book.subjects.join(', ') || 'None specified'}

Note: This is a Google Books preview. Full text content is not available through the API.
Only metadata and descriptions can be analyzed. For full text analysis, please use
Project Gutenberg, Open Library, or Standard Ebooks sources.
`;
      
      return content;
    } catch (error) {
      console.error('Error getting Google Books preview:', error);
      return null;
    }
  }

  /**
   * Get related/recommended books
   */
  async getRelatedBooks(bookId: string, limit: number = 10): Promise<ExternalBook[]> {
    try {
      const book = await this.getBook(bookId);
      if (!book) return [];

      // Use the book's categories or author to find related books
      const query = book.subjects.length > 0 
        ? `subject:"${book.subjects[0]}"` 
        : `inauthor:"${book.author}"`;
      
      const results = await this.searchBooks(query, 1, limit);
      
      // Filter out the current book
      return results.books.filter(b => b.id !== bookId);
    } catch (error) {
      console.error('Error getting related books:', error);
      return [];
    }
  }
}

// Export singleton instance
export const googleBooksAPI = new GoogleBooksAPI();