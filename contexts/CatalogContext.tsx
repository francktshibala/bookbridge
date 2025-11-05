'use client';

/**
 * Catalog Context
 * Manages browsing, discovery, and filtering state
 * Separate from AudioContext (which manages playback)
 *
 * Follows Phase 1 pattern: Single Source of Truth for catalog state
 * GPT-5 Enhancement: URL query params as source of truth
 */

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  fetchBooks,
  fetchCollections,
  parseFiltersFromURL,
  serializeFiltersToURL
} from '@/lib/services/book-catalog';
import type { BookFilters, PaginatedBooks } from '@/lib/services/book-catalog';
import type { FeaturedBook, BookCollection } from '@prisma/client';

interface CatalogContextState {
  // Collections
  collections: BookCollection[];
  selectedCollection: string | null;

  // Books
  books: FeaturedBook[];
  nextCursor: string | null; // Cursor-based pagination
  totalApprox?: number;
  facets?: PaginatedBooks['facets'];

  // Filters (read from URL)
  filters: BookFilters;

  // UI State
  loadState: 'idle' | 'loading' | 'ready' | 'error';
  error: string | null;

  // Actions
  selectCollection: (collectionId: string | null) => void;
  setFilters: (filters: Partial<BookFilters>) => void;
  search: (query: string) => void;
  loadNextPage: () => void;
  refreshCollections: () => Promise<void>;
}

const CatalogContext = createContext<CatalogContextState | null>(null);

export function CatalogProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [collections, setCollections] = useState<BookCollection[]>([]);
  const [books, setBooks] = useState<FeaturedBook[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [totalApprox, setTotalApprox] = useState<number | undefined>();
  const [facets, setFacets] = useState<PaginatedBooks['facets'] | undefined>();
  const [loadState, setLoadState] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  // Request ID for race condition prevention (Phase 1 pattern)
  const currentRequestIdRef = useRef<string | null>(null);

  // Derive filters from URL (GPT-5: URL as source of truth)
  const filters = parseFiltersFromURL(searchParams);
  const selectedCollection = filters.collectionId || null;

  // Load collections on mount
  const refreshCollections = useCallback(async () => {
    try {
      const data = await fetchCollections();
      setCollections(data);
    } catch (err) {
      console.error('[CatalogContext] Failed to load collections:', err);
    }
  }, []);

  // Update URL when filters change (GPT-5: URL sync)
  const updateFilters = useCallback((newFilters: Partial<BookFilters>) => {
    const merged = { ...filters, ...newFilters, cursor: undefined }; // Reset cursor on filter change
    const queryString = serializeFiltersToURL(merged);
    router.push(`?${queryString}`, { scroll: false });
  }, [filters, router]);

  // Select collection
  const selectCollection = useCallback((collectionId: string | null) => {
    updateFilters({ collectionId: collectionId || undefined });
  }, [updateFilters]);

  // Set filters
  const setFilters = useCallback((newFilters: Partial<BookFilters>) => {
    updateFilters(newFilters);
  }, [updateFilters]);

  // Search
  const search = useCallback((query: string) => {
    updateFilters({ search: query || undefined });
  }, [updateFilters]);

  // Load next page (cursor-based)
  const loadNextPage = useCallback(() => {
    if (nextCursor) {
      updateFilters({ cursor: nextCursor });
    }
  }, [nextCursor, updateFilters]);

  // Load collections on mount
  useEffect(() => {
    refreshCollections();
  }, [refreshCollections]);

  // Fetch books when URL changes (GPT-5: URL-driven data fetching)
  useEffect(() => {
    const abortController = new AbortController();
    const requestId = crypto.randomUUID();
    currentRequestIdRef.current = requestId;

    setLoadState('loading');
    setError(null);

    fetchBooks(filters, abortController.signal)
      .then(data => {
        // Guard: Only apply if request is still current (Phase 1 pattern)
        if (currentRequestIdRef.current === requestId) {
          setBooks(data.items);
          setNextCursor(data.nextCursor);
          setTotalApprox(data.totalApprox);
          setFacets(data.facets);
          setLoadState('ready');
        }
      })
      .catch(err => {
        if (err.name === 'AbortError') return;
        if (currentRequestIdRef.current === requestId) {
          setError(err.message);
          setLoadState('error');
        }
      });

    return () => {
      abortController.abort();
    };
  }, [searchParams]); // Re-fetch when URL changes

  return (
    <CatalogContext.Provider value={{
      collections,
      selectedCollection,
      books,
      nextCursor,
      totalApprox,
      facets,
      filters,
      loadState,
      error,
      selectCollection,
      setFilters,
      search,
      loadNextPage,
      refreshCollections
    }}>
      {children}
    </CatalogContext.Provider>
  );
}

export function useCatalogContext() {
  const context = useContext(CatalogContext);
  if (!context) {
    throw new Error('useCatalogContext must be used within CatalogProvider');
  }
  return context;
}
