/**
 * Catalog Browser Component
 * Main browsing interface combining all catalog components
 * Follows Phase 6 integration pattern
 * References: BOOK_ORGANIZATION_SCHEMES.md Phase 6
 */

'use client';

import { useState } from 'react';
import { useCatalogContext } from '@/contexts/CatalogContext';
import { CollectionSelector } from './CollectionSelector';
import { SearchBar } from './SearchBar';
import { BookFilters } from './BookFilters';
import { BookGrid } from './BookGrid';
import type { UnifiedBook } from '@/types/unified-book';

interface CatalogBrowserProps {
  onSelectBook: (book: UnifiedBook) => void;
  onAskAI?: (book: UnifiedBook) => void;
}

export function CatalogBrowser({ onSelectBook, onAskAI }: CatalogBrowserProps) {
  const {
    collections,
    selectedCollection,
    books,
    nextCursor,
    facets,
    filters,
    loadState,
    error,
    selectCollection,
    setFilters,
    search,
    loadNextPage
  } = useCatalogContext();

  const [showFilters, setShowFilters] = useState(false);

  const handleClearFilters = () => {
    setFilters({
      genres: undefined,
      moods: undefined,
      readingTimeMax: undefined,
      sortBy: 'popularityScore'
    });
  };

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1
            className="text-4xl md:text-5xl font-bold"
            style={{
              fontFamily: '"Playfair Display", Georgia, serif',
              color: 'var(--text-accent)',
              lineHeight: '1.2'
            }}
          >
            Library
          </h1>
          <p
            className="text-lg max-w-2xl mx-auto"
            style={{
              fontFamily: '"Source Serif Pro", Georgia, serif',
              color: 'var(--text-secondary)',
              lineHeight: '1.6'
            }}
          >
            Discover classic literature with adaptive audio narration and multiple difficulty levels
          </p>
        </div>

        {/* Search Bar */}
        <SearchBar
          onSearch={search}
          placeholder="Search by title, author, genre, mood, theme, or description..."
          showSuggestions={true}
        />

        {/* Collections - Hide when a collection is selected */}
        {collections.length > 0 && !filters.search && !selectedCollection && (
          <CollectionSelector
            collections={collections}
            selectedCollection={selectedCollection}
            onSelectCollection={selectCollection}
          />
        )}

        {/* Show "Back to Collections" button when collection is selected */}
        {selectedCollection && (
          <div className="flex items-center justify-center">
            <button
              onClick={() => selectCollection(null)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all"
              style={{
                background: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-light)',
                fontFamily: '"Source Serif Pro", Georgia, serif',
                fontWeight: 600
              }}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Collections
            </button>
          </div>
        )}

        {/* Filter Toggle & Active Filters */}
        <div className="flex items-center justify-center flex-wrap gap-4">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all"
            style={{
              background: showFilters ? 'var(--accent-primary)' : 'var(--bg-secondary)',
              color: showFilters ? 'var(--bg-primary)' : 'var(--text-primary)',
              border: showFilters ? 'none' : '1px solid var(--border-light)',
              fontFamily: '"Source Serif Pro", Georgia, serif',
              fontWeight: 600
            }}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            {showFilters ? 'Hide' : 'Show'} Filters
          </button>

          {loadState === 'ready' && books.length > 0 && (
            <p
              className="text-sm"
              style={{
                fontFamily: '"Source Serif Pro", Georgia, serif',
                color: 'var(--text-secondary)'
              }}
            >
              Showing {books.length} book{books.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div
            className="p-6 rounded-lg"
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-light)'
            }}
          >
            <BookFilters
              filters={filters}
              facets={facets}
              onFiltersChange={setFilters}
              onClearAll={handleClearFilters}
            />
          </div>
        )}

        {/* Books Grid */}
        <BookGrid
          books={books}
          loading={loadState === 'loading'}
          hasMore={!!nextCursor}
          onLoadMore={loadNextPage}
          onSelectBook={onSelectBook}
          onAskAI={onAskAI}
          emptyMessage={
            filters.search
              ? `No books found for "${filters.search}"`
              : 'No books found. Try adjusting your filters.'
          }
        />

        {/* Error State */}
        {loadState === 'error' && error && (
          <div
            className="p-6 rounded-lg text-center"
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--accent-primary)',
              color: 'var(--text-primary)'
            }}
          >
            <p
              className="text-lg font-semibold mb-2"
              style={{
                fontFamily: '"Playfair Display", Georgia, serif',
                color: 'var(--accent-primary)'
              }}
            >
              Error Loading Books
            </p>
            <p
              style={{
                fontFamily: '"Source Serif Pro", Georgia, serif',
                color: 'var(--text-secondary)'
              }}
            >
              {error}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
