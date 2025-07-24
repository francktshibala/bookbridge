/**
 * Open Library API Service
 * Uses Open Library API to fetch books from their 1.4M+ collection
 * API Documentation: https://openlibrary.org/developers/api
 */

// Open Library API Response Types
export interface OpenLibraryDoc {
  key: string;
  type: string;
  title: string;
  title_suggest?: string;
  title_sort?: string;
  subtitle?: string;
  alternative_title?: string[];
  alternative_subtitle?: string[];
  cover_i?: number;
  cover_edition_key?: string;
  isbn?: string[];
  last_modified_i: number;
  ebook_count_i?: number;
  edition_count?: number;
  edition_key?: string[];
  publish_date?: string[];
  publish_year?: number[];
  first_publish_year?: number;
  number_of_pages_median?: number;
  publish_place?: string[];
  oclc?: string[];
  lccn?: string[];
  contributor?: string[];
  lcc?: string[];
  ddc?: string[];
  lcc_sort?: string;
  ddc_sort?: string;
  author_key?: string[];
  author_name?: string[];
  author_alternative_name?: string[];
  subject?: string[];
  person?: string[];
  place?: string[];
  time?: string[];
  has_fulltext?: boolean;
  public_scan_b?: boolean;
  readinglog_count?: number;
  want_to_read_count?: number;
  currently_reading_count?: number;
  already_read_count?: number;
  publisher?: string[];
  language?: string[];
  seed?: string[];
  ia?: string[];
  ia_collection_s?: string;
  lending_edition_s?: string;
  lending_identifier_s?: string;
  printdisabled_s?: string;
  ratings_average?: number;
  ratings_sortable?: number;
  ratings_count?: number;
  ratings_count_1?: number;
  ratings_count_2?: number;
  ratings_count_3?: number;
  ratings_count_4?: number;
  ratings_count_5?: number;
}

export interface OpenLibrarySearchResponse {
  numFound: number;
  start: number;
  numFoundExact: boolean;
  docs: OpenLibraryDoc[];
  num_found: number;
  q: string;
  offset: number;
}

// Import our shared types
import type { ExternalBook, BookSearchResults } from '../../types/book-sources';

class OpenLibraryAPI {
  private baseUrl = 'https://openlibrary.org';
  
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
   * Calculate string similarity using Levenshtein distance
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const len1 = str1.length;
    const len2 = str2.length;
    
    if (len1 === 0) return len2 === 0 ? 1 : 0;
    if (len2 === 0) return 0;
    
    const matrix = Array(len2 + 1).fill(null).map(() => Array(len1 + 1).fill(null));
    
    for (let i = 0; i <= len1; i++) matrix[0][i] = i;
    for (let j = 0; j <= len2; j++) matrix[j][0] = j;
    
    for (let j = 1; j <= len2; j++) {
      for (let i = 1; i <= len1; i++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j - 1][i] + 1,     // deletion
          matrix[j][i - 1] + 1,     // insertion
          matrix[j - 1][i - 1] + cost // substitution
        );
      }
    }
    
    const maxLen = Math.max(len1, len2);
    return (maxLen - matrix[len2][len1]) / maxLen;
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
    
    // More aggressive matching - check if shorter title is contained in longer
    if (longer.includes(shorter) && shorter.length >= 6) return true;
    
    // Also check for very similar titles (allowing small differences)
    const similarity = this.calculateSimilarity(normalized1, normalized2);
    if (similarity > 0.75) return true; // Lowered threshold for more aggressive matching
    
    // Check for common edition patterns
    const editionPatterns = [
      /\s*\(.*edition.*\)/i,
      /\s*\(.*annotated.*\)/i,
      /\s*\(.*illustrated.*\)/i,
      /\s*\(.*complete.*\)/i,
      /\s*\(.*unabridged.*\)/i,
      /\s*:\s*.*edition/i,
      /\s*-\s*.*edition/i
    ];
    
    // Remove edition information and compare
    let cleaned1 = normalized1;
    let cleaned2 = normalized2;
    
    for (const pattern of editionPatterns) {
      cleaned1 = cleaned1.replace(pattern, '');
      cleaned2 = cleaned2.replace(pattern, '');
    }
    
    cleaned1 = cleaned1.trim();
    cleaned2 = cleaned2.trim();
    
    // Check if cleaned versions match
    return cleaned1 === cleaned2 && cleaned1.length > 5;
  }

  /**
   * Deduplicate books by grouping similar titles and keeping the best edition
   */
  private deduplicateBooks(books: ExternalBook[]): ExternalBook[] {
    console.log('Starting deduplication for Open Library books...');
    const groups: Map<string, ExternalBook[]> = new Map();
    
    // Group books by title only for more aggressive deduplication
    for (const book of books) {
      const titleCore = this.normalizeTitle(book.title);
      
      console.log(`Processing: "${book.title}" -> normalized: "${titleCore}"`);
      
      // Try to find existing group with similar title
      let grouped = false;
      
      // First, try exact title match
      if (groups.has(titleCore)) {
        console.log(`  -> Grouped with exact title match: ${titleCore}`);
        groups.get(titleCore)!.push(book);
        grouped = true;
      }
      
      // If not grouped yet, check for similar titles in any existing group
      if (!grouped) {
        for (const [key, group] of groups.entries()) {
          if (this.areTitlesSimilar(book.title, group[0].title)) {
            console.log(`  -> Grouped with similar title in group: ${key}`);
            group.push(book);
            grouped = true;
            break;
          }
        }
      }
      
      // If still not grouped, create a new group
      if (!grouped) {
        console.log(`  -> Created new group: ${titleCore}`);
        groups.set(titleCore, [book]);
      }
    }
    
    console.log(`Created ${groups.size} groups from ${books.length} books`);
    
    // From each group, pick the best edition
    const deduplicated: ExternalBook[] = [];
    
    for (const group of groups.values()) {
      const best = group.reduce((best, current) => {
        // Scoring system for selecting the best edition
        let bestScore = 0;
        let currentScore = 0;
        
        // Popularity is most important
        bestScore += (best.popularity || 0) * 10;
        currentScore += (current.popularity || 0) * 10;
        
        // Prefer books with ratings
        const bestRatings = (best as any).ratingsCount || 0;
        const currentRatings = (current as any).ratingsCount || 0;
        bestScore += bestRatings * 5;
        currentScore += currentRatings * 5;
        
        // Prefer books with cover images
        if (best.coverUrl) bestScore += 100;
        if (current.coverUrl) currentScore += 100;
        
        // Prefer shorter, cleaner titles (often the original)
        if (best.title.length < current.title.length) bestScore += 20;
        if (!best.title.includes(':') && current.title.includes(':')) bestScore += 10;
        if (!best.title.includes('(') && current.title.includes('(')) bestScore += 10;
        
        return currentScore > bestScore ? current : best;
      });
      
      deduplicated.push(best);
    }
    
    // Sort by popularity
    return deduplicated.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
  }

  /**
   * Transform Open Library API response to our standard format
   */
  private transformToSearchResults(response: OpenLibrarySearchResponse, page: number = 1): BookSearchResults {
    const allBooks = response.docs
      .map(doc => this.transformToExternalBook(doc))
      .filter((book): book is ExternalBook => book !== null);
    
    console.log(`Open Library: Before deduplication: ${allBooks.length} books`);
    
    // Deduplicate books and sort by popularity
    const deduplicatedBooks = this.deduplicateBooks(allBooks)
      .sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
      
    console.log(`Open Library: After deduplication: ${deduplicatedBooks.length} books`);
    
    return {
      books: deduplicatedBooks,
      totalCount: response.numFound,
      page,
      hasNextPage: (page * 100) < response.numFound, // Open Library uses limit of 100 per page
      hasPreviousPage: page > 1
    };
  }
  
  /**
   * Search for books by query
   */
  async searchBooks(query: string, page: number = 1): Promise<OpenLibrarySearchResponse> {
    try {
      const url = new URL(`${this.baseUrl}/search.json`);
      
      // Add search parameters
      if (query) {
        url.searchParams.append('q', query);
      }
      
      // Pagination (100 books per page, Open Library default)
      const limit = 100;
      const offset = (page - 1) * limit;
      url.searchParams.append('limit', limit.toString());
      url.searchParams.append('offset', offset.toString());
      
      // Only books with full text available
      url.searchParams.append('has_fulltext', 'true');
      
      // Prefer English books
      url.searchParams.append('language', 'eng');
      
      // Include additional fields we need
      url.searchParams.append('fields', 'key,type,title,subtitle,author_name,author_key,first_publish_year,subject,ia,has_fulltext,cover_i,readinglog_count,want_to_read_count,ratings_average,ratings_count,ebook_count_i,edition_count');
      
      console.log('Fetching from Open Library:', url.toString());
      
      const response = await fetch(url.toString());
      
      if (!response.ok) {
        throw new Error(`Open Library API error: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data as OpenLibrarySearchResponse;
      
    } catch (error) {
      console.error('Error fetching from Open Library:', error);
      throw error;
    }
  }
  
  /**
   * Get popular books (sorted by reading activity)
   */
  async getPopularBooks(page: number = 1): Promise<OpenLibrarySearchResponse> {
    try {
      const url = new URL(`${this.baseUrl}/search.json`);
      
      // Search for classic fiction books (simpler query)
      url.searchParams.append('q', 'classic fiction');
      
      // Pagination
      const limit = 100;
      const offset = (page - 1) * limit;
      url.searchParams.append('limit', limit.toString());
      url.searchParams.append('offset', offset.toString());
      
      // Only books with full text available
      url.searchParams.append('has_fulltext', 'true');
      
      // Remove complex sorting and fields that might cause issues
      
      console.log('Fetching popular books from Open Library:', url.toString());
      
      const response = await fetch(url.toString());
      
      if (!response.ok) {
        throw new Error(`Open Library API error: ${response.statusText}`);
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
  async getBooksBySubject(subject: string, page: number = 1): Promise<OpenLibrarySearchResponse> {
    try {
      const url = new URL(`${this.baseUrl}/search.json`);
      
      url.searchParams.append('q', `subject:${subject}`);
      
      // Pagination
      const limit = 100;
      const offset = (page - 1) * limit;
      url.searchParams.append('limit', limit.toString());
      url.searchParams.append('offset', offset.toString());
      
      // Only books with full text available
      url.searchParams.append('has_fulltext', 'true');
      
      // Include additional fields we need
      url.searchParams.append('fields', 'key,type,title,subtitle,author_name,author_key,first_publish_year,subject,ia,has_fulltext,cover_i,readinglog_count,want_to_read_count,ratings_average,ratings_count,ebook_count_i,edition_count');
      
      const response = await fetch(url.toString());
      
      if (!response.ok) {
        throw new Error(`Open Library API error: ${response.statusText}`);
      }
      
      return await response.json();
      
    } catch (error) {
      console.error('Error fetching books by subject:', error);
      throw error;
    }
  }
  
  /**
   * Get a specific book by Open Library key
   */
  async getBook(bookKey: string): Promise<OpenLibraryDoc | null> {
    try {
      // Remove '/works/' prefix if present
      const cleanKey = bookKey.replace(/^\/works\//, '');
      
      const url = new URL(`${this.baseUrl}/search.json`);
      url.searchParams.append('q', `key:/works/${cleanKey}`);
      url.searchParams.append('fields', 'key,type,title,subtitle,author_name,author_key,first_publish_year,subject,ia,has_fulltext,cover_i,readinglog_count,want_to_read_count,ratings_average,ratings_count,ebook_count_i,edition_count');
      
      const response = await fetch(url.toString());
      
      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`Open Library API error: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.docs?.[0] || null;
      
    } catch (error) {
      console.error('Error fetching book:', error);
      throw error;
    }
  }
  
  /**
   * Transform Open Library document to our internal format
   */
  transformToExternalBook(doc: OpenLibraryDoc): ExternalBook | null {
    // Skip if no full text available
    if (!doc.has_fulltext || !doc.ia || doc.ia.length === 0) {
      return null;
    }
    
    // Calculate popularity score from reading activity
    const readinglogCount = doc.readinglog_count || 0;
    const wantToReadCount = doc.want_to_read_count || 0;
    const ratingsCount = doc.ratings_count || 0;
    const popularity = readinglogCount + wantToReadCount + (ratingsCount * 2);
    
    // Get cover image URL
    let coverUrl: string | undefined;
    if (doc.cover_i) {
      coverUrl = `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`;
    }
    
    // Clean up the work key
    const workKey = doc.key.replace(/^\/works\//, '');
    
    return {
      id: `openlibrary-${workKey}`,
      title: doc.title,
      author: doc.author_name?.join(', ') || 'Unknown Author',
      coverUrl,
      subjects: doc.subject || [],
      language: 'en', // We filter for English books
      source: 'openlibrary',
      downloadUrl: `https://archive.org/details/${doc.ia[0]}`, // Use first Internet Archive identifier
      popularity,
      publicationYear: doc.first_publish_year
    };
  }
  
  /**
   * Fetch book content (actual text) - this will be implemented in the API route
   * For now, returns the Internet Archive URL where the content can be fetched
   */
  async fetchBookContent(internetArchiveId: string): Promise<string> {
    // This is a placeholder - the actual implementation will be in the API route
    // which will fetch from Internet Archive's text format
    throw new Error('fetchBookContent should be implemented in the API route');
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
export const openLibraryAPI = new OpenLibraryAPI();

// Export types
export type { OpenLibraryAPI };