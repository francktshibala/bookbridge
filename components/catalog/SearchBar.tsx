/**
 * Search Bar Component
 * Debounced search input with live suggestions
 * Follows Phase 3 component extraction pattern + Neo-Classic design system
 * References: NEO_CLASSIC_TRANSFORMATION_PLAN.md Phase 4 & 7 (Search UI)
 */

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { FeaturedBook } from '@prisma/client';
import { searchBooks } from '@/lib/services/book-catalog';

interface SearchBarProps {
  onSearch: (query: string) => void;
  placeholder?: string;
  showSuggestions?: boolean;
}

export function SearchBar({
  onSearch,
  placeholder = 'Search by title, author, genre, mood, theme, or description...',
  showSuggestions = true
}: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<FeaturedBook[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);

  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Debounced search (GPT-5 recommendation: 300ms)
  useEffect(() => {
    // Clear previous timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Abort previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // If query is empty, clear suggestions
    if (!query || query.length < 2) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    // Debounce: wait 300ms before searching
    debounceTimerRef.current = setTimeout(() => {
      setIsLoading(true);
      const controller = new AbortController();
      abortControllerRef.current = controller;

      searchBooks(query, 8, controller.signal)
        .then(results => {
          setSuggestions(results);
          setShowDropdown(results.length > 0);
          setIsLoading(false);
        })
        .catch(err => {
          if (err.name !== 'AbortError') {
            console.error('[SearchBar] Search failed:', err);
            setIsLoading(false);
          }
        });
    }, 300);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [query]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !inputRef.current?.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!showDropdown || suggestions.length === 0) {
      if (e.key === 'Enter') {
        onSearch(query);
        setShowDropdown(false);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex(prev =>
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex(prev => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (focusedIndex >= 0 && focusedIndex < suggestions.length) {
          const selected = suggestions[focusedIndex];
          handleSelectBook(selected);
        } else {
          onSearch(query);
          setShowDropdown(false);
        }
        break;
      case 'Escape':
        setShowDropdown(false);
        setFocusedIndex(-1);
        break;
    }
  }, [showDropdown, suggestions, focusedIndex, query, onSearch]);

  const handleSelectBook = (book: FeaturedBook) => {
    setQuery(book.title);
    onSearch(book.title);
    setShowDropdown(false);
    setFocusedIndex(-1);
  };

  const handleClear = () => {
    setQuery('');
    setSuggestions([]);
    setShowDropdown(false);
    setFocusedIndex(-1);
    onSearch('');
    inputRef.current?.focus();
  };

  return (
    <div className="relative w-full max-w-2xl mx-auto">
      {/* Search Input */}
      <div
        className="relative"
        style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-light)',
          borderRadius: '8px',
          boxShadow: '0 2px 8px var(--shadow-soft)',
          transition: 'all 0.2s ease'
        }}
      >
        {/* Search Icon */}
        <div
          className="absolute left-4 top-1/2 transform -translate-y-1/2 pointer-events-none"
          style={{ color: 'var(--text-secondary)' }}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        {/* Input Field */}
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (suggestions.length > 0) setShowDropdown(true);
          }}
          placeholder={placeholder}
          className="w-full pl-12 pr-12 py-3 bg-transparent outline-none"
          style={{
            fontFamily: '"Source Serif Pro", Georgia, serif',
            fontSize: '1rem',
            color: 'var(--text-primary)',
            lineHeight: '1.5'
          }}
        />

        {/* Loading Spinner or Clear Button */}
        <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
          {isLoading ? (
            <div
              className="animate-spin w-5 h-5 border-2 border-t-transparent rounded-full"
              style={{ borderColor: 'var(--accent-primary)' }}
            />
          ) : query && (
            <button
              onClick={handleClear}
              className="hover:opacity-70 transition-opacity"
              style={{ color: 'var(--text-secondary)' }}
              aria-label="Clear search"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Suggestions Dropdown */}
      <AnimatePresence>
        {showSuggestions && showDropdown && suggestions.length > 0 && (
          <motion.div
            ref={dropdownRef}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="absolute z-50 w-full mt-2"
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-light)',
              borderRadius: '8px',
              boxShadow: '0 4px 16px var(--shadow-soft)',
              maxHeight: '400px',
              overflowY: 'auto'
            }}
          >
            {suggestions.map((book, index) => (
              <button
                key={book.id}
                onClick={() => handleSelectBook(book)}
                onMouseEnter={() => setFocusedIndex(index)}
                className="w-full text-left transition-all duration-200 rounded-lg"
                style={{
                  padding: '0.75rem 1rem',
                  background: focusedIndex === index 
                    ? 'var(--accent-primary)/10' 
                    : 'transparent',
                  border: focusedIndex === index 
                    ? '1px solid var(--accent-primary)/30' 
                    : '1px solid transparent',
                  borderBottom: index < suggestions.length - 1 
                    ? '1px solid var(--border-light)' 
                    : 'none'
                }}
              >
                {/* Match BookCard design - Title and Author only */}
                <div>
                  <h4
                    className="font-bold text-base mb-1 line-clamp-2"
                    style={{
                      fontFamily: '"Playfair Display", Georgia, serif',
                      color: 'var(--text-accent)'
                    }}
                  >
                    {book.title}
                  </h4>
                  <p
                    className="text-sm truncate"
                    style={{
                      fontFamily: '"Source Serif Pro", Georgia, serif',
                      color: 'var(--text-secondary)'
                    }}
                  >
                    by {book.author}
                  </p>
                </div>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
