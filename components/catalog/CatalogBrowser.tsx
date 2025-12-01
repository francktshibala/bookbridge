/**
 * Catalog Browser Component
 * Main browsing interface combining all catalog components
 * Follows Phase 6 integration pattern
 * References: BOOK_ORGANIZATION_SCHEMES.md Phase 6
 */

'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useCatalogContext } from '@/contexts/CatalogContext';
import { CollectionSelector } from './CollectionSelector';
import { SearchBar } from './SearchBar';
import { BookFilters } from './BookFilters';
import { BookGrid } from './BookGrid';
import type { UnifiedBook } from '@/types/unified-book';

const READING_TIME_RANGES = [
  { label: 'Quick (< 15 min)', value: 15 },
  { label: 'Short (15-30 min)', value: 30 },
  { label: 'Medium (30-60 min)', value: 60 },
  { label: 'Long (1-2 hours)', value: 120 },
  { label: 'Extended (2+ hours)', value: 9999 }
];

const SORT_OPTIONS: { label: string; value: 'popularityScore' | 'readingTimeMinutes' | 'title' }[] = [
  { label: 'Most Popular', value: 'popularityScore' },
  { label: 'Shortest First', value: 'readingTimeMinutes' },
  { label: 'Title (A-Z)', value: 'title' }
];

// Quick Filter Chip Component
function QuickFilterChip({
  label,
  onClick,
  isActive
}: {
  label: string;
  onClick: () => void;
  isActive: boolean;
}) {
  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className="px-4 py-2 rounded-full text-sm font-medium transition-all"
      style={{
        fontFamily: '"Source Serif Pro", Georgia, serif',
        background: isActive ? 'var(--accent-primary)' : 'var(--bg-secondary)',
        color: isActive ? 'var(--bg-primary)' : 'var(--text-primary)',
        border: isActive ? 'none' : '1px solid var(--border-light)',
        boxShadow: isActive ? '0 2px 8px var(--shadow-soft)' : 'none'
      }}
    >
      {label}
    </motion.button>
  );
}

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

        {/* Quick Filter Chips - Always Visible */}
        {!selectedCollection && (
          <div className="flex items-center justify-center flex-wrap gap-2">
            <QuickFilterChip
              label="Quick Reads"
              onClick={() => {
                const currentMax = filters.readingTimeMax;
                setFilters({ readingTimeMax: currentMax === 30 ? undefined : 30 });
              }}
              isActive={filters.readingTimeMax === 30}
            />
            {/* Dynamic quick filters based on available facets */}
            {facets?.genres && facets.genres.length > 0 && (
              <>
                {/* Show top 3 most common genres */}
                {facets.genres.slice(0, 3).map(({ name, count }) => (
                  <QuickFilterChip
                    key={name}
                    label={`${name} (${count})`}
                    onClick={() => {
                      const currentGenres = filters.genres || [];
                      const hasGenre = currentGenres.includes(name);
                      const updatedGenres = hasGenre
                        ? currentGenres.filter(g => g !== name)
                        : [...currentGenres, name];
                      setFilters({
                        genres: updatedGenres.length > 0 ? updatedGenres : undefined
                      });
                    }}
                    isActive={filters.genres?.includes(name) || false}
                  />
                ))}
              </>
            )}
            {facets?.moods && facets.moods.length > 0 && (
              <>
                {/* Show top 2 most common moods */}
                {facets.moods.slice(0, 2).map(({ name, count }) => (
                  <QuickFilterChip
                    key={name}
                    label={`${name} (${count})`}
                    onClick={() => {
                      const currentMoods = filters.moods || [];
                      const hasMood = currentMoods.includes(name);
                      const updatedMoods = hasMood
                        ? currentMoods.filter(m => m !== name)
                        : [...currentMoods, name];
                      setFilters({
                        moods: updatedMoods.length > 0 ? updatedMoods : undefined
                      });
                    }}
                    isActive={filters.moods?.includes(name) || false}
                  />
                ))}
              </>
            )}
          </div>
        )}

        {/* Persistent Active Filter Summary */}
        {(() => {
          const activeFilters: string[] = [];
          if (filters.genres?.length) {
            filters.genres.forEach(g => activeFilters.push(`Genre: ${g}`));
          }
          if (filters.moods?.length) {
            filters.moods.forEach(m => activeFilters.push(`Mood: ${m}`));
          }
          if (filters.readingTimeMax) {
            const timeLabel = READING_TIME_RANGES.find(r => r.value === filters.readingTimeMax)?.label || `${filters.readingTimeMax} min`;
            activeFilters.push(`Time: ${timeLabel}`);
          }
          if (filters.sortBy && filters.sortBy !== 'popularityScore') {
            const sortLabel = SORT_OPTIONS.find(s => s.value === filters.sortBy)?.label || filters.sortBy;
            activeFilters.push(`Sort: ${sortLabel}`);
          }
          const hasActiveFilters = activeFilters.length > 0;

          return hasActiveFilters ? (
            <div
              className="flex items-center justify-between flex-wrap gap-3 p-4 rounded-lg"
              style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-light)'
              }}
            >
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className="text-sm font-semibold"
                  style={{
                    fontFamily: '"Source Serif Pro", Georgia, serif',
                    color: 'var(--text-accent)'
                  }}
                >
                  Active Filters:
                </span>
                {activeFilters.map((filter, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 rounded-full text-xs font-medium"
                    style={{
                      fontFamily: '"Source Serif Pro", Georgia, serif',
                      background: 'var(--accent-primary)/10',
                      color: 'var(--accent-primary)',
                      border: '1px solid var(--accent-primary)/30'
                    }}
                  >
                    {filter}
                  </span>
                ))}
              </div>
              <button
                onClick={handleClearFilters}
                className="text-sm px-4 py-2 rounded-lg font-semibold transition-all hover:opacity-80"
                style={{
                  fontFamily: '"Source Serif Pro", Georgia, serif',
                  background: 'var(--accent-primary)',
                  color: 'var(--bg-primary)'
                }}
              >
                Clear All
              </button>
            </div>
          ) : null;
        })()}

        {/* Collections - Hide when a collection is selected OR when filters are active */}
        {(() => {
          const hasActiveFilters = 
            (filters.genres?.length ?? 0) > 0 ||
            (filters.moods?.length ?? 0) > 0 ||
            filters.readingTimeMax !== undefined ||
            filters.search !== undefined;
          
          return collections.length > 0 && !hasActiveFilters && !selectedCollection ? (
            <CollectionSelector
              collections={collections}
              selectedCollection={selectedCollection}
              onSelectCollection={selectCollection}
            />
          ) : null;
        })()}

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
