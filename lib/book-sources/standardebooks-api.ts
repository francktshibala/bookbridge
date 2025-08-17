/**
 * Standard Ebooks API Service
 * Uses Standard Ebooks Atom feed to fetch premium formatted classics
 * Website: https://standardebooks.org/
 */

// Standard Ebooks Atom Feed Response Types
export interface StandardEbooksAuthor {
  name: string;
  uri?: string;
}

export interface StandardEbooksLink {
  rel: string;
  type: string;
  href: string;
  title?: string;
}

export interface StandardEbooksCategory {
  term: string;
  label?: string;
}

export interface StandardEbooksEntry {
  id: string;
  title: string;
  author: StandardEbooksAuthor;
  updated: string;
  published: string;
  rights: string;
  summary: string;
  content: string;
  links: StandardEbooksLink[];
  categories: StandardEbooksCategory[];
}

export interface StandardEbooksFeed {
  title: string;
  updated: string;
  entries: StandardEbooksEntry[];
}

// Import our shared types
import type { ExternalBook, BookSearchResults } from '../../types/book-sources';

class StandardEbooksAPI {
  private baseUrl = 'https://standardebooks.org';
  private feedUrl = 'https://standardebooks.org/opds/new-releases'; // Direct feed URL
  
  /**
   * Parse Atom XML feed to extract book entries
   */
  private parseAtomFeed(xmlText: string): StandardEbooksFeed {
    // Create a simple XML parser for the Atom feed
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlText, 'text/xml');
    
    const feedTitle = doc.querySelector('feed > title')?.textContent || 'Standard Ebooks';
    const feedUpdated = doc.querySelector('feed > updated')?.textContent || new Date().toISOString();
    
    const entries: StandardEbooksEntry[] = [];
    const entryElements = doc.querySelectorAll('entry');
    
    entryElements.forEach(entry => {
      const id = entry.querySelector('id')?.textContent || '';
      const title = entry.querySelector('title')?.textContent || '';
      const authorElement = entry.querySelector('author');
      const author = {
        name: authorElement?.querySelector('name')?.textContent || '',
        uri: authorElement?.querySelector('uri')?.textContent || undefined
      };
      const updated = entry.querySelector('updated')?.textContent || '';
      const published = entry.querySelector('published')?.textContent || '';
      const rights = entry.querySelector('rights')?.textContent || '';
      const summary = entry.querySelector('summary')?.textContent || '';
      const content = entry.querySelector('content')?.textContent || '';
      
      // Parse links
      const links: StandardEbooksLink[] = [];
      const linkElements = entry.querySelectorAll('link');
      linkElements.forEach(link => {
        links.push({
          rel: link.getAttribute('rel') || '',
          type: link.getAttribute('type') || '',
          href: link.getAttribute('href') || '',
          title: link.getAttribute('title') || undefined
        });
      });
      
      // Parse categories
      const categories: StandardEbooksCategory[] = [];
      const categoryElements = entry.querySelectorAll('category');
      categoryElements.forEach(category => {
        categories.push({
          term: category.getAttribute('term') || '',
          label: category.getAttribute('label') || undefined
        });
      });
      
      entries.push({
        id,
        title,
        author,
        updated,
        published,
        rights,
        summary,
        content,
        links,
        categories
      });
    });
    
    return {
      title: feedTitle,
      updated: feedUpdated,
      entries
    };
  }
  
  /**
   * Extract book URL slug from entry ID
   */
  private extractBookSlug(entryId: string): string {
    // Standard Ebooks entry IDs are typically URLs like:
    // https://standardebooks.org/ebooks/author-name/book-title
    const match = entryId.match(/\/ebooks\/(.+)$/);
    return match ? match[1] : '';
  }
  
  /**
   * Generate download URL for a specific format
   */
  private generateDownloadUrl(bookSlug: string, format: 'epub' | 'azw3' | 'kepub' = 'epub'): string {
    // Standard Ebooks download URLs follow the pattern:
    // https://standardebooks.org/ebooks/author/title/downloads/author_title.format
    const downloadSlug = bookSlug.replace(/\//g, '_');
    return `${this.baseUrl}/ebooks/${bookSlug}/downloads/${downloadSlug}.${format}`;
  }
  
  /**
   * Transform Standard Ebooks entry to our internal format
   */
  transformToExternalBook(entry: StandardEbooksEntry): ExternalBook | null {
    const bookSlug = this.extractBookSlug(entry.id);
    if (!bookSlug) {
      console.warn(`Could not extract book slug from entry ID: ${entry.id}`);
      return null;
    }
    
    // Find cover image link
    const coverLink = entry.links.find(link => 
      link.type?.includes('image') || link.rel === 'http://opds-spec.org/image/thumbnail'
    );
    
    // Find the main book page link
    const bookPageLink = entry.links.find(link => 
      link.type === 'text/html' && link.rel === 'alternate'
    );
    
    // Extract subjects from categories
    const subjects = entry.categories.map(cat => cat.label || cat.term);
    
    // Calculate a popularity score based on recency (newer books get higher scores)
    const publishedDate = new Date(entry.published);
    const daysSincePublished = (Date.now() - publishedDate.getTime()) / (1000 * 60 * 60 * 24);
    const popularity = Math.max(0, 1000 - daysSincePublished); // Newer books score higher
    
    return {
      id: `standardebooks-${bookSlug.replace(/\//g, '-')}`,
      title: entry.title,
      author: entry.author.name,
      coverUrl: coverLink?.href,
      subjects,
      language: 'en', // Standard Ebooks are English classics
      source: 'standard-ebooks',
      downloadUrl: this.generateDownloadUrl(bookSlug, 'epub'),
      popularity,
      publicationYear: publishedDate.getFullYear(),
      description: entry.summary || entry.content
    };
  }
  
  /**
   * Fetch the Atom feed
   */
  async fetchFeed(): Promise<StandardEbooksFeed> {
    try {
      console.log('Fetching Standard Ebooks feed:', this.feedUrl);
      
      // Use proxy for browser environment to avoid CORS
      const isServer = typeof window === 'undefined';
      const fetchUrl = isServer 
        ? this.feedUrl 
        : `/api/books/standardebooks/proxy?url=${encodeURIComponent(this.feedUrl)}`;
      
      const response = await fetch(fetchUrl, {
        headers: {
          'Accept': 'application/atom+xml, application/xml, text/xml'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Standard Ebooks feed error: ${response.statusText}`);
      }
      
      const xmlText = await response.text();
      return this.parseAtomFeed(xmlText);
      
    } catch (error) {
      console.error('Error fetching Standard Ebooks feed:', error);
      throw error;
    }
  }
  
  /**
   * Get all books from the feed
   */
  async getAllBooks(): Promise<StandardEbooksEntry[]> {
    const feed = await this.fetchFeed();
    return feed.entries;
  }
  
  /**
   * Search books by query (client-side filtering of feed results)
   */
  async searchBooks(query: string): Promise<StandardEbooksEntry[]> {
    const allBooks = await this.getAllBooks();
    
    if (!query) {
      return allBooks;
    }
    
    const searchTerm = query.toLowerCase();
    
    return allBooks.filter(book => 
      book.title.toLowerCase().includes(searchTerm) ||
      book.author.name.toLowerCase().includes(searchTerm) ||
      book.summary.toLowerCase().includes(searchTerm) ||
      book.categories.some(cat => 
        (cat.label || cat.term).toLowerCase().includes(searchTerm)
      )
    );
  }
  
  /**
   * Get books by subject/genre
   */
  async getBooksBySubject(subject: string): Promise<StandardEbooksEntry[]> {
    const allBooks = await this.getAllBooks();
    const subjectLower = subject.toLowerCase();
    
    return allBooks.filter(book =>
      book.categories.some(cat =>
        (cat.label || cat.term).toLowerCase().includes(subjectLower)
      )
    );
  }
  
  /**
   * Get a specific book by its slug
   */
  async getBook(bookSlug: string): Promise<StandardEbooksEntry | null> {
    try {
      const allBooks = await this.getAllBooks();
      
      return allBooks.find(book => {
        const entrySlug = this.extractBookSlug(book.id);
        return entrySlug === bookSlug;
      }) || null;
      
    } catch (error) {
      console.error('Error fetching book:', error);
      throw error;
    }
  }
  
  /**
   * Fetch book content (EPUB file)
   * Note: This returns the download URL since we'll need to handle EPUB parsing separately
   */
  async fetchBookContent(downloadUrl: string): Promise<string> {
    try {
      console.log('Fetching Standard Ebooks content from:', downloadUrl);
      
      // For now, we'll throw an error since EPUB parsing requires additional libraries
      // This will be implemented in the API route with proper EPUB parsing
      throw new Error('Standard Ebooks EPUB content fetching should be implemented in the API route with EPUB parsing library');
      
    } catch (error) {
      console.error('Error fetching Standard Ebooks content:', error);
      throw error;
    }
  }
  
  /**
   * Get all books in our standard format
   */
  async getAllBooksStandard(): Promise<BookSearchResults> {
    try {
      const entries = await this.getAllBooks();
      const books = entries
        .map(entry => this.transformToExternalBook(entry))
        .filter((book): book is ExternalBook => book !== null)
        .sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
      
      return {
        books,
        totalCount: books.length,
        page: 1,
        hasNextPage: false,
        hasPreviousPage: false
      };
    } catch (error) {
      console.warn('Standard Ebooks temporarily unavailable, returning empty results');
      return {
        books: [],
        totalCount: 0,
        page: 1,
        hasNextPage: false,
        hasPreviousPage: false
      };
    }
  }
  
  /**
   * Search books in our standard format
   */
  async searchBooksStandard(query: string): Promise<BookSearchResults> {
    const entries = await this.searchBooks(query);
    const books = entries
      .map(entry => this.transformToExternalBook(entry))
      .filter((book): book is ExternalBook => book !== null)
      .sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
    
    return {
      books,
      totalCount: books.length,
      page: 1,
      hasNextPage: false,
      hasPreviousPage: false
    };
  }
  
  /**
   * Get popular books (in this case, most recent releases)
   */
  async getPopularBooksStandard(): Promise<BookSearchResults> {
    try {
      return this.getAllBooksStandard();
    } catch (error) {
      console.warn('Standard Ebooks temporarily unavailable for popular books');
      return {
        books: [],
        totalCount: 0,
        page: 1,
        hasNextPage: false,
        hasPreviousPage: false
      };
    }
  }
}

// Export singleton instance
export const standardEbooksAPI = new StandardEbooksAPI();

// Export types
export type { StandardEbooksAPI };