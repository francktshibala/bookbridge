/**
 * Unified Book Types
 * 
 * Represents books from both Featured Books (bundle architecture) 
 * and Enhanced Books (chunk architecture) for catalog unification
 */

export type BookArchitecture = 'bundle' | 'chunk';

export interface UnifiedBook {
  // Common fields
  id: string;
  title: string;
  author: string;
  description?: string;
  
  // Architecture detection
  architecture: BookArchitecture;
  
  // Featured Book fields (bundle architecture)
  slug?: string; // For Featured Books routing
  sentences?: number;
  bundles?: number;
  gradient?: string;
  abbreviation?: string;
  
  // Enhanced Book fields (chunk architecture)
  genre?: string;
  cefrLevels?: string;
  estimatedHours?: number;
  totalChunks?: number;
  status?: 'enhanced' | 'processing' | 'planned';
  availableLevels?: string[];
  
  // Metadata
  source?: 'featured' | 'enhanced';
}

/**
 * Type guard to check if book is Featured Book (bundle architecture)
 */
export function isFeaturedBook(book: UnifiedBook): boolean {
  return book.architecture === 'bundle' || book.source === 'featured' || !!book.slug;
}

/**
 * Type guard to check if book is Enhanced Book (chunk architecture)
 */
export function isEnhancedBook(book: UnifiedBook): boolean {
  return book.architecture === 'chunk' || book.source === 'enhanced' || !!book.totalChunks;
}

