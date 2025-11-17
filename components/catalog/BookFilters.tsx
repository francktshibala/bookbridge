/**
 * Book Filters Component
 * Multi-select filters for genres, moods, reading time, etc.
 * Follows Phase 3 component extraction pattern + Neo-Classic design system
 * References: NEO_CLASSIC_TRANSFORMATION_PLAN.md Phase 4 & 7 (Filter UI)
 */

'use client';

import { motion } from 'framer-motion';
import type { BookFilters as FilterType } from '@/lib/services/book-catalog';
import type { PaginatedBooks } from '@/lib/services/book-catalog';

interface BookFiltersProps {
  filters: FilterType;
  facets?: PaginatedBooks['facets'];
  onFiltersChange: (filters: Partial<FilterType>) => void;
  onClearAll: () => void;
}

const READING_TIME_RANGES = [
  { label: 'Quick (< 15 min)', value: 15 },
  { label: 'Short (15-30 min)', value: 30 },
  { label: 'Medium (30-60 min)', value: 60 },
  { label: 'Long (1-2 hours)', value: 120 },
  { label: 'Extended (2+ hours)', value: 9999 }
];

const SORT_OPTIONS: { label: string; value: FilterType['sortBy'] }[] = [
  { label: 'Most Popular', value: 'popularityScore' },
  { label: 'Shortest First', value: 'readingTimeMinutes' },
  { label: 'Title (A-Z)', value: 'title' }
];

export function BookFilters({
  filters,
  facets,
  onFiltersChange,
  onClearAll
}: BookFiltersProps) {
  const hasActiveFilters =
    (filters.genres?.length ?? 0) > 0 ||
    (filters.moods?.length ?? 0) > 0 ||
    filters.readingTimeMax !== undefined ||
    (filters.sortBy && filters.sortBy !== 'popularityScore');

  const toggleGenre = (genre: string) => {
    const current = filters.genres || [];
    const updated = current.includes(genre)
      ? current.filter(g => g !== genre)
      : [...current, genre];
    onFiltersChange({ genres: updated.length > 0 ? updated : undefined });
  };

  const toggleMood = (mood: string) => {
    const current = filters.moods || [];
    const updated = current.includes(mood)
      ? current.filter(m => m !== mood)
      : [...current, mood];
    onFiltersChange({ moods: updated.length > 0 ? updated : undefined });
  };

  const setReadingTime = (max: number | undefined) => {
    onFiltersChange({ readingTimeMax: max });
  };

  const setSortBy = (sortBy: FilterType['sortBy']) => {
    onFiltersChange({ sortBy });
  };

  return (
    <div className="space-y-8">
      {/* Header with Clear All */}
      <div className="flex items-center justify-between pb-4 border-b" style={{ borderColor: 'var(--border-light)' }}>
        <h3
          className="text-2xl font-bold"
          style={{
            fontFamily: '"Playfair Display", Georgia, serif',
            color: 'var(--text-accent)'
          }}
        >
          Filters
        </h3>

        {hasActiveFilters && (
          <button
            onClick={onClearAll}
            className="text-sm px-4 py-2 rounded-lg font-semibold transition-all hover:opacity-80"
            style={{
              fontFamily: '"Source Serif Pro", Georgia, serif',
              background: 'var(--accent-primary)',
              color: 'var(--bg-primary)'
            }}
          >
            Clear All
          </button>
        )}
      </div>

      {/* Sort By */}
      <FilterSection title="Sort By">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {SORT_OPTIONS.map(option => (
            <FilterChip
              key={option.value}
              label={option.label}
              isActive={filters.sortBy === option.value || (!filters.sortBy && option.value === 'popularityScore')}
              onClick={() => setSortBy(option.value)}
            />
          ))}
        </div>
      </FilterSection>

      {/* Genres */}
      {facets?.genres && facets.genres.length > 0 && (
        <FilterSection title="Genres">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {facets.genres.map(({ name, count }) => (
              <FilterChip
                key={name}
                label={`${name} (${count})`}
                isActive={filters.genres?.includes(name) || false}
                onClick={() => toggleGenre(name)}
              />
            ))}
          </div>
        </FilterSection>
      )}

      {/* Moods */}
      {facets?.moods && facets.moods.length > 0 && (
        <FilterSection title="Moods">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {facets.moods.map(({ name, count }) => (
              <FilterChip
                key={name}
                label={`${name} (${count})`}
                isActive={filters.moods?.includes(name) || false}
                onClick={() => toggleMood(name)}
              />
            ))}
          </div>
        </FilterSection>
      )}

      {/* Reading Time */}
      <FilterSection title="Reading Time">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {READING_TIME_RANGES.map(range => (
            <FilterChip
              key={range.value}
              label={range.label}
              isActive={filters.readingTimeMax === range.value}
              onClick={() =>
                setReadingTime(
                  filters.readingTimeMax === range.value ? undefined : range.value
                )
              }
            />
          ))}
        </div>
      </FilterSection>

      {/* Active Filters Summary */}
      {hasActiveFilters && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="pt-4"
          style={{
            borderTop: '1px solid var(--border-light)'
          }}
        >
          <p
            className="text-sm"
            style={{
              fontFamily: '"Source Serif Pro", Georgia, serif',
              color: 'var(--text-secondary)'
            }}
          >
            {getActiveFiltersCount(filters)} active filter{getActiveFiltersCount(filters) !== 1 ? 's' : ''}
          </p>
        </motion.div>
      )}
    </div>
  );
}

// Helper Components

function FilterSection({
  title,
  children
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-4">
      <h4
        className="text-sm font-bold uppercase tracking-wider"
        style={{
          fontFamily: '"Source Serif Pro", Georgia, serif',
          color: 'var(--text-accent)',
          letterSpacing: '0.1em'
        }}
      >
        {title}
      </h4>
      {children}
    </div>
  );
}

function FilterChip({
  label,
  isActive,
  onClick
}: {
  label: string;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="w-full px-4 py-2.5 rounded-lg text-sm font-medium transition-all text-center"
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

// Helper Functions

function getActiveFiltersCount(filters: FilterType): number {
  let count = 0;
  if (filters.genres?.length) count += filters.genres.length;
  if (filters.moods?.length) count += filters.moods.length;
  if (filters.readingTimeMax !== undefined) count += 1;
  if (filters.sortBy && filters.sortBy !== 'popularityScore') count += 1;
  return count;
}
