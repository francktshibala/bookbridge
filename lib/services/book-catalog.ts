/**
 * Book Catalog Service
 * Pure functions for fetching and filtering books
 * Follows Phase 4 service layer pattern + GPT-5 cursor pagination
 */

import type { FeaturedBook, BookCollection } from '@prisma/client';

export interface BookFilters {
  collectionId?: string;
  genres?: string[];
  moods?: string[];
  region?: string;
  readingTimeMax?: number;
  search?: string;
  cursor?: string; // Cursor-based pagination (GPT-5 recommendation)
  limit?: number;
  sortBy?: 'popularityScore' | 'readingTimeMinutes' | 'title';
}

export interface PaginatedBooks {
  items: FeaturedBook[]; // Changed from 'books' (GPT-5 standardization)
  nextCursor: string | null; // Cursor-based pagination
  totalApprox?: number;
  facets?: {
    genres: { name: string; count: number }[];
    moods: { name: string; count: number }[];
    readingTimes: { range: string; count: number }[];
  };
}

export interface PaginatedCollectionBooks {
  books: FeaturedBook[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

/**
 * Fetch books with filters and cursor-based pagination
 * (GPT-5 recommendation)
 */
export async function fetchBooks(
  filters: BookFilters = {},
  signal?: AbortSignal
): Promise<PaginatedBooks> {
  const params = new URLSearchParams();

  if (filters.collectionId) params.set('collection', filters.collectionId);
  if (filters.genres?.length) params.set('genres', filters.genres.join(','));
  if (filters.moods?.length) params.set('moods', filters.moods.join(','));
  if (filters.region) params.set('region', filters.region);
  if (filters.readingTimeMax) params.set('readingTimeMax', filters.readingTimeMax.toString());
  if (filters.search) params.set('q', filters.search);
  if (filters.cursor) params.set('cursor', filters.cursor); // Cursor instead of page
  if (filters.limit) params.set('limit', filters.limit.toString());
  if (filters.sortBy) params.set('sort', filters.sortBy);

  const response = await fetch(`/api/featured-books?${params}`, {
    signal,
    next: { revalidate: 300 } // 5 min revalidation (GPT-5)
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch books: ${response.statusText}`);
  }

  return response.json();
}

/**
 * URL State Helpers (GPT-5 recommendation)
 * Serialize/deserialize filters to/from URL query params
 */
/**
 * Serialize filters to URL with deterministic ordering (GPT-5 recommendation)
 * Ensures consistent URLs for caching
 */
export function serializeFiltersToURL(filters: BookFilters): string {
  const params: [string, string][] = [];

  // Add params in alphabetical order for deterministic URLs
  if (filters.collectionId) params.push(['collection', filters.collectionId]);
  if (filters.cursor) params.push(['cursor', filters.cursor]);

  // Sort arrays before joining for consistency
  if (filters.genres?.length) {
    const sorted = [...filters.genres].sort();
    params.push(['genres', sorted.join(',')]);
  }

  if (filters.moods?.length) {
    const sorted = [...filters.moods].sort();
    params.push(['moods', sorted.join(',')]);
  }

  if (filters.search) params.push(['q', filters.search]);
  if (filters.region) params.push(['region', filters.region]);
  if (filters.sortBy && filters.sortBy !== 'popularityScore') params.push(['sort', filters.sortBy]);
  if (filters.readingTimeMax) params.push(['time', filters.readingTimeMax.toString()]);

  // Sort by key for deterministic order
  params.sort((a, b) => a[0].localeCompare(b[0]));

  return new URLSearchParams(params).toString();
}

export function parseFiltersFromURL(searchParams: URLSearchParams): BookFilters {
  const collectionId = searchParams.get('collection') || undefined;
  // CRITICAL: Use higher limit for collections to show all books
  // Collections can have 20+ books (e.g., Modern Voices has 21+)
  // Default: 50 for collections, 20 for general search
  // See: docs/MODERN_VOICES_IMPLEMENTATION_GUIDE.md Mistake #7
  const defaultLimit = collectionId ? 50 : 20;
  return {
    collectionId,
    genres: searchParams.get('genres')?.split(',').filter(Boolean) || undefined,
    moods: searchParams.get('moods')?.split(',').filter(Boolean) || undefined,
    region: searchParams.get('region') || undefined,
    readingTimeMax: searchParams.get('time') ? parseInt(searchParams.get('time')!) : undefined,
    search: searchParams.get('q') || undefined,
    cursor: searchParams.get('cursor') || undefined,
    sortBy: (searchParams.get('sort') as BookFilters['sortBy']) || 'popularityScore',
    limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : defaultLimit
  };
}

/**
 * Fetch all collections
 */
export async function fetchCollections(
  type?: string,
  signal?: AbortSignal
): Promise<BookCollection[]> {
  const params = type ? `?type=${type}` : '';

  const response = await fetch(`/api/collections${params}`, {
    signal,
    next: { revalidate: 3600 }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch collections: ${response.statusText}`);
  }

  const data = await response.json();
  return data.collections;
}

/**
 * Fetch books in a specific collection
 */
export async function fetchCollectionBooks(
  collectionId: string,
  page: number = 1,
  limit: number = 20,
  signal?: AbortSignal
): Promise<PaginatedCollectionBooks> {
  const response = await fetch(
    `/api/collections/${collectionId}/books?page=${page}&limit=${limit}`,
    { signal, next: { revalidate: 300 } }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch collection books: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Search books by query
 */
export async function searchBooks(
  query: string,
  limit: number = 10,
  signal?: AbortSignal
): Promise<FeaturedBook[]> {
  if (!query || query.length < 2) return [];

  const response = await fetch(
    `/api/books/search?q=${encodeURIComponent(query)}&limit=${limit}`,
    { signal, next: { revalidate: 300 } }
  );

  if (!response.ok) {
    throw new Error(`Failed to search books: ${response.statusText}`);
  }

  const data = await response.json();
  return data.books || [];
}
