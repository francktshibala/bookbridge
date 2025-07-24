/**
 * Project Gutenberg API Service
 * Uses Gutendex API to fetch public domain books
 * API Documentation: https://gutendex.com/
 */

// Gutendex API Response Types
export interface GutenbergAuthor {
  name: string;
  birth_year: number | null;
  death_year: number | null;
}

export interface GutenbergBook {
  id: number;
  title: string;
  authors: GutenbergAuthor[];
  translators: GutenbergAuthor[];
  subjects: string[];
  bookshelves: string[];
  languages: string[];
  copyright: boolean;
  media_type: string;
  formats: {
    [key: string]: string;
  };
  download_count: number;
}

export interface GutenbergSearchResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: GutenbergBook[];
}

// Import our shared types
import type { ExternalBook, BookSearchResults } from '../../types/book-sources';

class GutenbergAPI {
  private baseUrl = 'https://gutendex.com';
  
  /**
   * Normalize book title for comparison (remove punctuation, extra words, case)
   */
  private normalizeTitle(title: string): string {
    return title
      .toLowerCase()
      // Remove edition information first
      .replace(/\s*\(.*?(edition|annotated|illustrated|complete|unabridged|vol|volume).*?\)/gi, '')
      .replace(/\s*:\s*.*(edition|annotated|illustrated|complete|unabridged)/gi, '')
      .replace(/\s*-\s*.*(edition|annotated|illustrated|complete|unabridged)/gi, '')
      // Remove common descriptors
      .replace(/\s*\b(classic|complete|works|collected|selected|stories|tales|novels)\b/gi, '')
      // Remove punctuation
      .replace(/[^\w\s]/g, '')
      // Remove common words
      .replace(/\b(the|a|an|or|and|of|in|to|for|with|by)\b/g, '')
      // Normalize spaces
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Check if two titles are similar (for deduplication)
   */
  private areTitlesSimilar(title1: string, title2: string): boolean {
    const normalized1 = this.normalizeTitle(title1);
    const normalized2 = this.normalizeTitle(title2);
    
    // Exact match after normalization
    if (normalized1 === normalized2) return true;
    
    // Check if one is a substring of the other (for editions/variations)
    const longer = normalized1.length > normalized2.length ? normalized1 : normalized2;
    const shorter = normalized1.length <= normalized2.length ? normalized1 : normalized2;
    
    // Increase minimum length requirement to avoid false positives
    if (shorter.length < 8) return false;
    
    // Restore original aggressive deduplication for Gutenberg
    return longer.includes(shorter) && shorter.length > 5;
  }

  /**
   * Deduplicate books by grouping similar titles and keeping the best edition
   */
  private deduplicateBooks(books: ExternalBook[]): ExternalBook[] {
    const groups: ExternalBook[][] = [];
    
    // Group similar books
    for (const book of books) {
      let foundGroup = false;
      
      for (const group of groups) {
        if (this.areTitlesSimilar(book.title, group[0].title)) {
          group.push(book);
          foundGroup = true;
          break;
        }
      }
      
      if (!foundGroup) {
        groups.push([book]);
      }
    }
    
    // From each group, pick the book with highest popularity
    return groups.map(group => {
      return group.reduce((best, current) => {
        // Prefer books with higher popularity
        if ((current.popularity || 0) > (best.popularity || 0)) return current;
        
        // If popularity is same, prefer shorter titles (likely original)
        if ((current.popularity || 0) === (best.popularity || 0)) {
          return current.title.length < best.title.length ? current : best;
        }
        
        return best;
      });
    });
  }

  /**
   * Transform Gutenberg API response to our standard format
   */
  private transformToSearchResults(response: GutenbergSearchResponse, page: number = 1): BookSearchResults {
    const allBooks = response.results
      .map(book => this.transformToExternalBook(book))
      .filter((book): book is ExternalBook => book !== null);
    
    // Deduplicate books and sort by popularity
    const deduplicatedBooks = this.deduplicateBooks(allBooks)
      .sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
    
    return {
      books: deduplicatedBooks,
      totalCount: response.count,
      page,
      hasNextPage: response.next !== null,
      hasPreviousPage: response.previous !== null
    };
  }
  
  /**
   * Search for books by query
   */
  async searchBooks(query: string, page: number = 1): Promise<GutenbergSearchResponse> {
    try {
      const url = new URL(`${this.baseUrl}/books`);
      
      // Add search parameters
      if (query) {
        url.searchParams.append('search', query);
      }
      
      // Pagination (32 books per page by default)
      url.searchParams.append('page', page.toString());
      
      console.log('Fetching from Gutenberg:', url.toString());
      
      const response = await fetch(url.toString());
      
      if (!response.ok) {
        throw new Error(`Gutenberg API error: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data as GutenbergSearchResponse;
      
    } catch (error) {
      console.error('Error fetching from Gutenberg:', error);
      throw error;
    }
  }
  
  /**
   * Get popular books (sorted by download count)
   */
  async getPopularBooks(page: number = 1): Promise<GutenbergSearchResponse> {
    try {
      const url = new URL(`${this.baseUrl}/books`);
      
      // Sort by popularity (download count)
      url.searchParams.append('sort', 'popular');
      url.searchParams.append('page', page.toString());
      
      // Only English books
      url.searchParams.append('languages', 'en');
      
      const response = await fetch(url.toString());
      
      if (!response.ok) {
        throw new Error(`Gutenberg API error: ${response.statusText}`);
      }
      
      return await response.json();
      
    } catch (error) {
      console.error('Error fetching popular books:', error);
      throw error;
    }
  }
  
  /**
   * Get books by subject/genre
   */
  async getBooksBySubject(subject: string, page: number = 1): Promise<GutenbergSearchResponse> {
    try {
      const url = new URL(`${this.baseUrl}/books`);
      
      url.searchParams.append('topic', subject);
      url.searchParams.append('page', page.toString());
      
      const response = await fetch(url.toString());
      
      if (!response.ok) {
        throw new Error(`Gutenberg API error: ${response.statusText}`);
      }
      
      return await response.json();
      
    } catch (error) {
      console.error('Error fetching books by subject:', error);
      throw error;
    }
  }
  
  /**
   * Get a specific book by ID
   */
  async getBook(bookId: number): Promise<GutenbergBook | null> {
    try {
      const response = await fetch(`${this.baseUrl}/books/${bookId}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`Gutenberg API error: ${response.statusText}`);
      }
      
      return await response.json();
      
    } catch (error) {
      console.error('Error fetching book:', error);
      throw error;
    }
  }
  
  /**
   * Transform Gutenberg book to our internal format
   */
  transformToExternalBook(book: GutenbergBook): ExternalBook | null {
    // Find the best text format URL - check all possible text formats
    const textUrl = book.formats['text/plain; charset=utf-8'] || 
                   book.formats['text/plain; charset=us-ascii'] ||
                   book.formats['text/plain'] ||
                   book.formats['text/plain; charset=iso-8859-1'];
    
    if (!textUrl) {
      console.warn(`No text format found for book ${book.id}: ${book.title}`);
      return null;
    }
    
    // Get cover image
    const coverUrl = book.formats['image/jpeg'] || 
                    book.formats['image/png'] ||
                    undefined;
    
    return {
      id: `gutenberg-${book.id}`,
      title: book.title,
      author: book.authors.map(a => a.name).join(', ') || 'Unknown Author',
      coverUrl,
      subjects: book.subjects,
      language: book.languages[0] || 'en',
      source: 'gutenberg',
      downloadUrl: textUrl,
      popularity: book.download_count
    };
  }
  
  /**
   * Fetch book content (actual text)
   */
  async fetchBookContent(downloadUrl: string): Promise<string> {
    try {
      console.log('Fetching book content from:', downloadUrl);
      
      const response = await fetch(downloadUrl);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch book content: ${response.statusText}`);
      }
      
      const content = await response.text();
      
      // Basic cleaning - remove excessive whitespace
      return content
        .replace(/\r\n/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
      
    } catch (error) {
      console.error('Error fetching book content:', error);
      throw error;
    }
  }
  
  /**
   * Get popular books in our standard format
   */
  async getPopularBooksStandard(page: number = 1): Promise<BookSearchResults> {
    const response = await this.getPopularBooks(page);
    return this.transformToSearchResults(response, page);
  }
  
  /**
   * Search books in our standard format
   */
  async searchBooksStandard(query: string, page: number = 1): Promise<BookSearchResults> {
    const response = await this.searchBooks(query, page);
    return this.transformToSearchResults(response, page);
  }
}

// Export singleton instance
export const gutenbergAPI = new GutenbergAPI();

// Export types
export type { GutenbergAPI };