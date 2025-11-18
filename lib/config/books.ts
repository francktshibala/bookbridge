/**
 * Book Configuration
 * Central configuration for all featured books, API mappings, and default levels
 */

// Valid CEFR levels as a type
export type CEFRLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

/**
 * Normalizes and validates CEFR level input
 *
 * Ensures case-insensitive level matching across the application.
 * All CEFR levels are stored as uppercase in mappings and databases.
 *
 * @param level - User input level (any case, may have whitespace)
 * @returns Uppercase validated CEFRLevel
 * @throws Error if level is invalid
 *
 * @example
 * normalizeLevel('a1')    // Returns 'A1'
 * normalizeLevel('A1 ')   // Returns 'A1' (trimmed)
 * normalizeLevel('B2')    // Returns 'B2'
 * normalizeLevel('invalid') // Throws error
 */
export function normalizeLevel(level: string): CEFRLevel {
  const normalized = level.trim().toUpperCase();
  const validLevels: CEFRLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

  if (!validLevels.includes(normalized as CEFRLevel)) {
    throw new Error(`Invalid CEFR level: "${level}". Valid levels are: ${validLevels.join(', ')}`);
  }

  return normalized as CEFRLevel;
}

export interface FeaturedBook {
  id: string;
  title: string;
  author: string;
  description: string;
  sentences: number;
  bundles: number;
  gradient: string;
  abbreviation: string;
}

export const ALL_FEATURED_BOOKS: FeaturedBook[] = [
  // ✅ WORKING BOOKS - Perfect Experience (Top Priority)
  {
    id: 'the-necklace',
    title: 'The Necklace',
    author: 'Guy de Maupassant',
    description: 'Powerful short story about desire and sacrifice. A1, A2 & B1 levels with thematic sections. Perfect 15-minute emotional journey with Sarah (A1) & Daniel (A2/B1) voices.',
    sentences: 20,
    bundles: 5,
    gradient: 'from-purple-500 to-pink-600',
    abbreviation: 'TN'
  },
  {
    id: 'lady-with-dog',
    title: 'The Lady with the Dog',
    author: 'Anton Chekhov',
    description: 'Psychological masterpiece about unexpected love. A1, A2 & B1 levels with Sarah (A1), Daniel (A2), and Jane (B1) voice narration across 6 thematic chapters.',
    sentences: 349,
    bundles: 88,
    gradient: 'from-blue-500 to-purple-600',
    abbreviation: 'LD'
  },
  {
    id: 'gift-of-the-magi',
    title: 'The Gift of the Magi',
    author: 'O. Henry',
    description: 'Heartwarming Christmas story about love and sacrifice. A1, A2 & B1 levels with Grandpa (A1), James (A2), and Jane (B1) voice narration.',
    sentences: 51,
    bundles: 13,
    gradient: 'from-red-500 to-green-600',
    abbreviation: 'GM'
  },
  {
    id: 'tell-tale-heart',
    title: 'The Tell-Tale Heart',
    author: 'Edgar Allan Poe',
    description: 'Gothic psychological thriller about guilt and madness. A1 level with Daniel voice narration. Perfect for building reading confidence.',
    sentences: 277,
    bundles: 70,
    gradient: 'from-red-500 to-gray-900',
    abbreviation: 'TH'
  },
  {
    id: 'the-dead',
    title: 'The Dead',
    author: 'James Joyce',
    description: 'Modernist masterpiece about love, memory, and mortality. Joyce\'s most celebrated story simplified to A1 level. 451 sentences across 113 bundles with Sarah voice narration.',
    sentences: 451,
    bundles: 113,
    gradient: 'from-blue-500 to-indigo-600',
    abbreviation: 'TD'
  },
  {
    id: 'the-metamorphosis',
    title: 'The Metamorphosis',
    author: 'Franz Kafka',
    description: 'Kafka\'s absurdist masterpiece about transformation and alienation. A man wakes as a giant bug. Simplified to A1 level. 280 sentences across 70 bundles with Sarah voice narration.',
    sentences: 280,
    bundles: 70,
    gradient: 'from-gray-500 to-slate-600',
    abbreviation: 'TM'
  },

  // 📚 OTHER BOOKS - Various Status
  {
    id: 'great-gatsby-a2',
    title: 'The Great Gatsby',
    author: 'F. Scott Fitzgerald',
    description: 'Jazz Age masterpiece with A2 simplification. 3,605 sentences across 902 bundles narrated by Sarah.',
    sentences: 3605,
    bundles: 902,
    gradient: 'from-green-500 to-teal-600',
    abbreviation: 'GG'
  },
  {
    id: 'gutenberg-1952-A1',
    title: 'The Yellow Wallpaper',
    author: 'Charlotte Perkins Gilman',
    description: 'Psychological masterpiece simplified to A1 level. 372 sentences across 93 bundles with immersive narration.',
    sentences: 372,
    bundles: 93,
    gradient: 'from-yellow-500 to-amber-600',
    abbreviation: 'YW'
  },
  {
    id: 'gutenberg-43',
    title: 'Dr. Jekyll and Mr. Hyde (A2)',
    author: 'Robert Louis Stevenson',
    description: 'Gothic classic with natural compound sentences. A2 level with Daniel voice narration.',
    sentences: 100,
    bundles: 25,
    gradient: 'from-purple-500 to-indigo-600',
    abbreviation: 'JH'
  },
  {
    id: 'the-devoted-friend',
    title: 'The Devoted Friend',
    author: 'Oscar Wilde',
    description: 'Moral fairy tale about true friendship vs exploitation. A1 level with Sarah voice narration. PILOT: 10 bundles available.',
    sentences: 40,
    bundles: 10,
    gradient: 'from-blue-500 to-purple-600',
    abbreviation: 'DF'
  },
  {
    id: 'sleepy-hollow-enhanced',
    title: 'The Legend of Sleepy Hollow',
    author: 'Washington Irving',
    description: 'Spooky classic enhanced with A1 simplification. 320 sentences across 80 bundles perfect for Halloween.',
    sentences: 320,
    bundles: 80,
    gradient: 'from-orange-500 to-red-600',
    abbreviation: 'SH'
  },
];

export const FEATURED_BOOKS = ALL_FEATURED_BOOKS;

// Dynamic API mappings for books with multiple levels
export const BOOK_API_MAPPINGS: { [bookId: string]: { [level: string]: string } } = {
  'gutenberg-43': {
    'A1': '/api/jekyll-hyde/bundles',
    'A2': '/api/jekyll-hyde-a2/bundles'
  },
  'gift-of-the-magi': {
    'A1': '/api/gift-of-the-magi-a1/bundles',
    'A2': '/api/gift-of-the-magi-a2/bundles',
    'B1': '/api/gift-of-the-magi-b1/bundles'
  },
  'the-devoted-friend': {
    'A1': '/api/devoted-friend-a1/bundles',
    'A2': '/api/devoted-friend-a2/bundles',
    'B1': '/api/devoted-friend-b1/bundles'
  },
  'lady-with-dog': {
    'A1': '/api/lady-with-dog-a1/bundles',
    'A2': '/api/lady-with-dog-a2/bundles',
    'B1': '/api/lady-with-dog-b1/bundles'
  },
  'the-dead': {
    'A1': '/api/the-dead-a1/bundles',
    'A2': '/api/the-dead-a2/bundles'
  },
  'the-metamorphosis': {
    'A1': '/api/the-metamorphosis-a1/bundles'
  },
  'the-necklace': {
    'A1': '/api/the-necklace-a1/bundles',
    'A2': '/api/the-necklace-a2/bundles',
    'B1': '/api/the-necklace-b1/bundles'
  },
  'tell-tale-heart': {
    'A1': '/api/tell-tale-heart-a1/bundles',
    'A2': '/api/tell-tale-heart-a2/bundles'
  },
  // Single-level books use the default /api/test-book/real-bundles
};

// Default levels for books (used as starting point)
export const BOOK_DEFAULT_LEVELS: { [bookId: string]: string } = {
  'great-gatsby-a2': 'A2',
  'gutenberg-1952-A1': 'A1',
  'gutenberg-43': 'A2',  // Default to A2 for Jekyll & Hyde
  'sleepy-hollow-enhanced': 'A1',
  'the-necklace': 'A1',  // Default to A1 for The Necklace (A1/A2/B1 support)
  'gift-of-the-magi': 'A1',  // Default to A1 for Gift of the Magi (A1/A2 support)
  'lady-with-dog': 'A1',  // Default to A1 for The Lady with the Dog
  'the-dead': 'A1',  // Default to A1 for The Dead
  'the-metamorphosis': 'A1',  // Default to A1 for The Metamorphosis
  'the-devoted-friend': 'A1',  // Default to A1 for The Devoted Friend
  'tell-tale-heart': 'A1',  // Default to A1 for The Tell-Tale Heart
};

// Get the correct CEFR level for a book
export const getBookDefaultLevel = (bookId: string): string => {
  return BOOK_DEFAULT_LEVELS[bookId] || 'A1';
};

/**
 * Get the API endpoint for a specific book and CEFR level
 *
 * Returns the correct bundle API endpoint for featured books with custom routes.
 * Uses case-insensitive level matching to prevent routing errors.
 *
 * **Architecture Context**:
 * - Custom endpoints query PostgreSQL (Prisma) for featured books with ElevenLabs audio
 * - Fallback endpoint queries Supabase for enhanced collection books
 * - All mapping keys are uppercase; input is normalized at this boundary
 *
 * **Critical Fix (Nov 2025)**:
 * Previously failed when level='a1' didn't match mapping key='A1',
 * causing 404 errors and fallback to wrong database. Now uses normalizeLevel()
 * for case-insensitive lookup.
 *
 * @param bookId - Book identifier (e.g., 'the-necklace', 'the-dead')
 * @param level - CEFR level (any case: 'a1', 'A1', 'B2', etc.)
 * @returns API endpoint path for bundle fetching
 *
 * @example
 * getBookApiEndpoint('the-necklace', 'a1')  // '/api/the-necklace-a1/bundles'
 * getBookApiEndpoint('the-necklace', 'A1')  // '/api/the-necklace-a1/bundles' (same)
 * getBookApiEndpoint('unknown-book', 'A1')  // '/api/test-book/real-bundles' (fallback)
 */
export const getBookApiEndpoint = (bookId: string, level: string): string => {
  // Normalize level to uppercase for mapping lookup (case-insensitive)
  const normalizedLevel = normalizeLevel(level);

  // Check if book has custom API mappings
  if (BOOK_API_MAPPINGS[bookId] && BOOK_API_MAPPINGS[bookId][normalizedLevel]) {
    return BOOK_API_MAPPINGS[bookId][normalizedLevel];
  }

  // Default to test-book API (fallback for books without custom endpoints)
  return '/api/test-book/real-bundles';
};

// Multi-level books configuration
export const MULTI_LEVEL_BOOKS: { [key: string]: string[] } = {
  'gutenberg-43': ['A1', 'A2'],
  'gift-of-the-magi': ['A1', 'A2', 'B1'],
  'the-devoted-friend': ['A1', 'A2', 'B1'],
  'lady-with-dog': ['A1', 'A2', 'B1'],
  'the-dead': ['A1', 'A2'],
  'the-metamorphosis': ['A1'],
  'the-necklace': ['A1', 'A2', 'B1'],  // Multi-level book (A1, A2, B1 support)
  'tell-tale-heart': ['A1', 'A2'],  // A1 with Daniel, A2 with Jane
};

// Single-level books configuration
export const SINGLE_LEVEL_BOOKS: { [key: string]: string } = {
  'great-gatsby-a2': 'A2',
  'gutenberg-1952-A1': 'A1',
  'sleepy-hollow-enhanced': 'A1',
  // 'the-necklace' removed - it's now in MULTI_LEVEL_BOOKS
};
