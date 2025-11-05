'use client';

/**
 * Catalog Context
 * Manages browsing, discovery, and filtering state
 * Separate from AudioContext (which manages playback)
 *
 * Follows Phase 1 pattern: Single Source of Truth for catalog state
 * GPT-5 Enhancements:
 * - URL query params as source of truth
 * - LRU cache for responses
 * - Prefetch next cursor when idle
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
import { trackCatalogSearch, trackNoResults } from '@/lib/telemetry';

// LRU Cache for responses (GPT-5 recommendation)
class LRUCache<T> {
  private cache = new Map<string, T>();
  private maxSize: number;

  constructor(maxSize: number = 20) {
    this.maxSize = maxSize;
  }

  get(key: string): T | undefined {
    if (!this.cache.has(key)) return undefined;
    // Move to end (most recently used)
    const value = this.cache.get(key)!;
    this.cache.delete(key);
    this.cache.set(key, value);
    return value;
  }

  set(key: string, value: T): void {
    // Remove if exists (to re-add at end)
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }
    // Evict oldest if at capacity
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value as string;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }
    this.cache.set(key, value);
  }

  clear(): void {
    this.cache.clear();
  }
}

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

// Singleton cache instance (GPT-5: shared across component mounts)
const responseCache = new LRUCache<PaginatedBooks>(20);

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

  // Prefetch abort controller
  const prefetchAbortRef = useRef<AbortController | null>(null);

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

  // Fetch books when URL changes (GPT-5: URL-driven + LRU cache + telemetry)
  useEffect(() => {
    const cacheKey = searchParams.toString();
    const startTime = performance.now(); // Track TTFA (GPT-5)

    // Check cache first (GPT-5 recommendation)
    const cached = responseCache.get(cacheKey);
    if (cached) {
      const duration = performance.now() - startTime;
      setBooks(cached.items);
      setNextCursor(cached.nextCursor);
      setTotalApprox(cached.totalApprox);
      setFacets(cached.facets);
      setLoadState('ready');

      // Track cache hit (GPT-5: telemetry)
      trackCatalogSearch({
        query: filters.search,
        filters,
        resultCount: cached.items.length,
        duration,
        cacheHit: true
      });

      // Track no results (GPT-5: important metric)
      if (cached.items.length === 0) {
        trackNoResults({ query: filters.search, filters });
      }

      return;
    }

    const abortController = new AbortController();
    const requestId = crypto.randomUUID();
    currentRequestIdRef.current = requestId;

    setLoadState('loading');
    setError(null);

    fetchBooks(filters, abortController.signal)
      .then(data => {
        const duration = performance.now() - startTime;

        // Guard: Only apply if request is still current (Phase 1 pattern)
        if (currentRequestIdRef.current === requestId) {
          setBooks(data.items);
          setNextCursor(data.nextCursor);
          setTotalApprox(data.totalApprox);
          setFacets(data.facets);
          setLoadState('ready');

          // Store in cache (GPT-5: prevent refetch on minor toggles)
          responseCache.set(cacheKey, data);

          // Track search performance (GPT-5: telemetry)
          trackCatalogSearch({
            query: filters.search,
            filters,
            resultCount: data.items.length,
            duration,
            cacheHit: false
          });

          // Track no results (GPT-5: important metric)
          if (data.items.length === 0) {
            trackNoResults({ query: filters.search, filters });
          }
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
  }, [searchParams, filters]); // Re-fetch when URL changes

  // Prefetch next page when idle (GPT-5 recommendation)
  useEffect(() => {
    if (!nextCursor || loadState !== 'ready') return;

    // Cancel previous prefetch
    if (prefetchAbortRef.current) {
      prefetchAbortRef.current.abort();
    }

    // Wait 500ms before prefetching (user might still be interacting)
    const timeout = setTimeout(() => {
      const controller = new AbortController();
      prefetchAbortRef.current = controller;

      const nextFilters = { ...filters, cursor: nextCursor };
      const nextCacheKey = serializeFiltersToURL(nextFilters);

      // Only prefetch if not already cached
      if (!responseCache.get(nextCacheKey)) {
        fetchBooks(nextFilters, controller.signal)
          .then(data => {
            responseCache.set(nextCacheKey, data);
          })
          .catch(() => {
            // Ignore prefetch errors
          });
      }
    }, 500);

    return () => {
      clearTimeout(timeout);
      if (prefetchAbortRef.current) {
        prefetchAbortRef.current.abort();
        prefetchAbortRef.current = null;
      }
    };
  }, [nextCursor, loadState, filters]);

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
