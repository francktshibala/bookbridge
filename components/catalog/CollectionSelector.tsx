/**
 * Collection Selector Component
 * Displays collection cards for browsing
 * Follows Phase 3 component extraction pattern + Neo-Classic design system
 * References: NEO_CLASSIC_TRANSFORMATION_PLAN.md Phase 4 & 7 (Enhanced Collection cards)
 */

import { motion } from 'framer-motion';
import type { BookCollection } from '@prisma/client';

interface CollectionSelectorProps {
  collections: (BookCollection & { _count?: { books: number } })[];
  selectedCollection: string | null;
  onSelectCollection: (collectionId: string | null) => void;
}

export function CollectionSelector({
  collections,
  selectedCollection,
  onSelectCollection
}: CollectionSelectorProps) {
  if (collections.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header - Neo-Classic Typography */}
      <h2
        className="text-3xl font-bold"
        style={{
          fontFamily: '"Playfair Display", Georgia, serif',
          color: 'var(--text-accent)',
          lineHeight: '1.2'
        }}
      >
        Browse Collections
      </h2>

      {/* Grid - Responsive layout matching Enhanced Collection */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {collections.map((collection, index) => (
          <motion.button
            key={collection.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            onClick={() => onSelectCollection(
              selectedCollection === collection.id ? null : collection.id
            )}
            className="group relative text-left transition-all duration-300"
            style={{
              background: 'var(--bg-secondary)',
              border: selectedCollection === collection.id
                ? '2px solid var(--accent-primary)'
                : '1px solid var(--border-light)',
              borderRadius: '8px',
              padding: '1.5rem',
              boxShadow: '0 2px 8px var(--shadow-soft)',
              minHeight: '140px'
            }}
          >
            {/* Hover effect */}
            <div
              className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
              style={{
                boxShadow: '0 4px 16px var(--shadow-soft)'
              }}
            />

            <div className="relative flex items-start gap-4">
              {/* Icon */}
              {collection.icon && (
                <span className="text-5xl flex-shrink-0" role="img" aria-label={collection.name}>
                  {collection.icon}
                </span>
              )}

              {/* Content */}
              <div className="flex-1 min-w-0">
                <h3
                  className="font-bold text-lg mb-1 truncate"
                  style={{
                    fontFamily: '"Playfair Display", Georgia, serif',
                    color: 'var(--text-accent)'
                  }}
                >
                  {collection.name}
                </h3>

                {collection.description && (
                  <p
                    className="text-sm mb-2 line-clamp-2"
                    style={{
                      fontFamily: '"Source Serif Pro", Georgia, serif',
                      color: 'var(--text-secondary)',
                      lineHeight: '1.5'
                    }}
                  >
                    {collection.description}
                  </p>
                )}

                {/* Book count badge */}
                <span
                  className="inline-block text-xs px-2 py-1 rounded-full bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] border border-[var(--accent-primary)]"
                  style={{
                    fontFamily: '"Source Serif Pro", Georgia, serif',
                    fontWeight: 600
                  }}
                >
                  {collection._count?.books || 0} books
                </span>
              </div>
            </div>

            {/* Selected indicator */}
            {selectedCollection === collection.id && (
              <div
                className="absolute top-3 right-3"
                style={{ color: 'var(--accent-primary)' }}
                aria-hidden="true"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
            )}
          </motion.button>
        ))}
      </div>
    </div>
  );
}
