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

  // 🎤 MODERN VOICES COLLECTION - TED Talks & Contemporary Content
  {
    id: 'power-of-vulnerability',
    title: 'The Power of Vulnerability',
    author: 'Brené Brown',
    description: 'Life-changing TED Talk about human connection, shame, and worthiness. A1 level with Jane voice narration. 388 sentences across 97 bundles exploring courage, authenticity, and vulnerability.',
    sentences: 388,
    bundles: 97,
    gradient: 'from-pink-500 to-rose-600',
    abbreviation: 'PV'
  },
  {
    id: 'danger-of-single-story',
    title: 'The Danger of a Single Story',
    author: 'Chimamanda Ngozi Adichie',
    description: 'Powerful TED Talk about stereotypes, identity, and the importance of diverse narratives. A1 level with Sarah voice narration. 122 sentences across 31 bundles exploring culture, representation, and human dignity.',
    sentences: 122,
    bundles: 31,
    gradient: 'from-orange-500 to-purple-600',
    abbreviation: 'DS'
  },
  {
    id: 'how-great-leaders-inspire-action',
    title: 'How Great Leaders Inspire Action',
    author: 'Simon Sinek',
    description: 'Transformative TED Talk about the Golden Circle: Why, How, and What. Learn why great leaders like Apple, Wright Brothers, and MLK inspire action by starting with purpose. A1 level with Daniel voice narration.',
    sentences: 85,
    bundles: 22,
    gradient: 'from-blue-500 to-indigo-600',
    abbreviation: 'GL'
  },
  {
    id: 'always-a-family',
    title: 'Always a Family',
    author: 'Danny & Annie Perasa',
    description: 'Deeply moving StoryCorps conversation about 63 years of love. Danny reads daily love notes he leaves for Annie. A1-A2-B1 levels available. Heartwarming, tearjerker story perfect for all levels.',
    sentences: 44,
    bundles: 11,
    gradient: 'from-pink-500 to-rose-600',
    abbreviation: 'AF'
  },
  {
    id: 'helen-keller',
    title: 'The Story of My Life',
    author: 'Helen Keller',
    description: 'The inspiring true story of Helen Keller\'s breakthrough moment learning language at age 7. After years of frustration and isolation, Anne Sullivan arrives and teaches Helen that words have meaning. A powerful memoir about transformation, hope, and the power of education. A1 level with Jane voice.',
    sentences: 117,
    bundles: 30,
    gradient: 'from-purple-500 to-indigo-600',
    abbreviation: 'HK'
  },
  {
    id: 'teen-translating-hospital',
    title: 'A Lifeline: Teen Translating for Parents Through Hospital Chaos',
    author: 'BookBridge',
    description: 'A powerful story about a 14-year-old girl who becomes her family\'s translator during a medical emergency. When her sister needs help at the hospital, she must translate between English and Spanish. This inspiring narrative explores courage, responsibility, and discovering your own strength. A1 level with Jane voice.',
    sentences: 185,
    bundles: 47,
    gradient: 'from-teal-500 to-cyan-600',
    abbreviation: 'TT'
  },
  {
    id: 'teaching-dad-to-read',
    title: 'First-Gen Student Teaching Dad to Read',
    author: 'BookBridge',
    description: 'A heartwarming story of an eight-year-old girl who becomes her father\'s teacher, helping him learn to read English. Through patience, love, and determination, they discover that learning together can heal relationships and build unbreakable bonds. This inspiring tale shows how courage and compassion can transform a family. A1 level with Daniel voice.',
    sentences: 155,
    bundles: 39,
    gradient: 'from-orange-500 to-amber-600',
    abbreviation: 'TD'
  },
  {
    id: 'immigrant-entrepreneur',
    title: 'Immigrant Entrepreneur: From Failure to Success',
    author: 'BookBridge',
    description: 'A powerful story about immigrant entrepreneurs who lost everything—to fire, to war, to financial struggles—but refused to give up. Through hard work, community support, and unwavering determination, they rebuilt their dreams and found success. This inspiring tale shows that sometimes, losing everything is the beginning of something even greater. A1 level with Daniel voice.',
    sentences: 160,
    bundles: 40,
    gradient: 'from-green-500 to-emerald-600',
    abbreviation: 'IE'
  },
  {
    id: 'refugee-journey-1',
    title: 'Refugee Journey: From War Zone to Hope',
    author: 'BookBridge',
    description: 'A powerful story about a young refugee who flees war and arrives in a new country with nothing. Through language barriers, hard work, and moments of despair, she finds hope and transforms her life. This inspiring tale shows the resilience of refugees and the power of finding belonging. A1 level with Sarah voice.',
    sentences: 252,
    bundles: 63,
    gradient: 'from-indigo-500 to-blue-600',
    abbreviation: 'RJ'
  },
  {
    id: 'community-builder-1',
    title: 'Community Builder: One Person Transforms a Neighborhood',
    author: 'BookBridge',
    description: 'An inspiring story about ordinary people who see problems in their neighborhood and decide to act. Through community gardens, safe spaces, and empowerment, they build connections and transform their neighborhoods. This powerful tale shows how one person can make a big difference and create belonging. A1 level with Jane voice.',
    sentences: 212,
    bundles: 53,
    gradient: 'from-green-500 to-teal-600',
    abbreviation: 'CB'
  },
  {
    id: 'disability-overcome-1',
    title: 'Disability Overcome: Finding New Ways',
    author: 'BookBridge',
    description: 'An inspiring story about Maria, who loses her hearing at age 18 and watches her dream of becoming a choir director die. Through deep depression, her father\'s encouragement, and finding new ways to make music, she transforms her life and achieves her dreams. This powerful tale shows how people adapt, persist, and overcome challenges. A1 level with Daniel voice.',
    sentences: 207,
    bundles: 52,
    gradient: 'from-indigo-500 to-purple-600',
    abbreviation: 'DO'
  },
  {
    id: 'career-pivot-1',
    title: 'Career Pivot: Finding Your Path',
    author: 'BookBridge',
    description: 'An inspiring story about David, a lawyer with a perfect job on paper but empty inside. He works all the time and misses important moments with his family. When he misses his son\'s birthday, it becomes a wake-up call. This powerful tale shows how people find courage to leave safe jobs and follow their dreams. A1 level with Daniel voice.',
    sentences: 181,
    bundles: 46,
    gradient: 'from-blue-500 to-cyan-600',
    abbreviation: 'CP'
  },
  {
    id: 'second-chance-1',
    title: 'Second Chance: Finding Redemption',
    author: 'BookBridge',
    description: 'An inspiring story about Maria, who faces difficult times and gets a second chance. After despair and rock bottom, she finds hope through determination, support, and transformation. This powerful tale shows how people can rebuild their lives, find redemption, and create new beginnings. A1 level with Jane voice.',
    sentences: 212,
    bundles: 53,
    gradient: 'from-orange-500 to-red-600',
    abbreviation: 'SC'
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
    'A2': '/api/tell-tale-heart-a2/bundles',
    'B1': '/api/tell-tale-heart-b1/bundles'
  },
  'the-last-leaf': {
    'B1': '/api/the-last-leaf-b1/bundles'
  },
  'after-twenty-years': {
    'A1': '/api/after-twenty-years-a1/bundles',
    'A2': '/api/after-twenty-years-a2/bundles',
    'B1': '/api/after-twenty-years-b1/bundles'
  },
  'story-of-an-hour': {
    'A1': '/api/story-of-an-hour-a1/bundles'
  },
  'power-of-vulnerability': {
    'A1': '/api/power-of-vulnerability-a1/bundles'
  },
  'danger-of-single-story': {
    'A1': '/api/danger-of-single-story-a1/bundles',
    'A2': '/api/danger-of-single-story-a2/bundles',
    'B1': '/api/danger-of-single-story-b1/bundles'
  },
  'how-great-leaders-inspire-action': {
    'A1': '/api/how-great-leaders-inspire-action-a1/bundles',
    'A2': '/api/how-great-leaders-inspire-action-a2/bundles',
    'B1': '/api/how-great-leaders-inspire-action-b1/bundles'
  },
  'always-a-family': {
    'A1': '/api/always-a-family-a1/bundles',
    'A2': '/api/always-a-family-a2/bundles',
    'B1': '/api/always-a-family-b1/bundles'
  },
  'helen-keller': {
    'A1': '/api/helen-keller-a1/bundles'
  },
  'teen-translating-hospital': {
    'A1': '/api/teen-translating-hospital-a1/bundles'
  },
  'teaching-dad-to-read': {
    'A1': '/api/teaching-dad-to-read-a1/bundles'
  },
  'immigrant-entrepreneur': {
    'A1': '/api/immigrant-entrepreneur-a1/bundles'
  },
  'refugee-journey-1': {
    'A1': '/api/refugee-journey-1-a1/bundles'
  },
  'community-builder-1': {
    'A1': '/api/community-builder-1-a1/bundles'
  },
  'disability-overcome-1': {
    'A1': '/api/disability-overcome-1-a1/bundles'
  },
  'career-pivot-1': {
    'A1': '/api/career-pivot-1-a1/bundles'
  },
  'second-chance-1': {
    'A1': '/api/second-chance-1-a1/bundles'
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
  'the-last-leaf': 'B1',  // Default to B1 for The Last Leaf
  'after-twenty-years': 'A1',  // Default to A1 for After Twenty Years
  'power-of-vulnerability': 'A1',  // Default to A1 for The Power of Vulnerability (TED Talk)
  'danger-of-single-story': 'A1',  // Default to A1 for The Danger of a Single Story (TED Talk)
  'how-great-leaders-inspire-action': 'A1',  // Default to A1 for How Great Leaders Inspire Action (TED Talk)
  'always-a-family': 'A1',  // Default to A1 for Always a Family (StoryCorps)
  'helen-keller': 'A1',  // Default to A1 for Helen Keller - The Story of My Life (Memoir)
  'teen-translating-hospital': 'A1',  // Default to A1 for Teen Translating for Parents Through Hospital Chaos (Modern Story)
  'teaching-dad-to-read': 'A1',  // Default to A1 for First-Gen Student Teaching Dad to Read (Modern Story)
  'immigrant-entrepreneur': 'A1',  // Default to A1 for Immigrant Entrepreneur: From Failure to Success (Modern Story)
  'refugee-journey-1': 'A1',  // Default to A1 for Refugee Journey: From War Zone to Hope (Modern Story)
  'community-builder-1': 'A1',  // Default to A1 for Community Builder: One Person Transforms a Neighborhood (Modern Story)
  'disability-overcome-1': 'A1',  // Default to A1 for Disability Overcome: Finding New Ways (Modern Story)
  'career-pivot-1': 'A1',  // Default to A1 for Career Pivot: Finding Your Path (Modern Story)
  'second-chance-1': 'A1',  // Default to A1 for Second Chance: Finding Redemption (Modern Story)
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
  'tell-tale-heart': ['A1', 'A2', 'B1'],  // A1 with Daniel, A2 & B1 with Jane
  'the-last-leaf': ['B1'],  // B1 with Jane
  'after-twenty-years': ['A1', 'A2', 'B1'],  // A1 with Daniel, A2 & B1 with Jane
  'story-of-an-hour': ['A1'],  // A1 with Jane (user requested)
  'power-of-vulnerability': ['A1', 'A2', 'B1'],  // A1 with Jane, A2 with Daniel, B1 with Jane (TED Talk - Modern Voices collection)
  'danger-of-single-story': ['A1', 'A2', 'B1'],  // A1 with Sarah, A2 with Daniel, B1 with Jane (TED Talk - Modern Voices collection)
  'how-great-leaders-inspire-action': ['A1', 'A2', 'B1'],  // A1 with Daniel, A2 with Jane, B1 with Sarah (TED Talk - Modern Voices collection)
  'always-a-family': ['A1', 'A2', 'B1'],  // A1 with Sarah, A2 with Jane, B1 with Daniel (StoryCorps - Modern Voices collection)
  'helen-keller': ['A1'],  // A1 with Jane (Memoir - Modern Voices collection)
  'teen-translating-hospital': ['A1'],  // A1 with Jane (Modern Story - Modern Voices collection)
  'teaching-dad-to-read': ['A1'],  // A1 with Daniel (Modern Story - Modern Voices collection)
  'immigrant-entrepreneur': ['A1'],  // A1 with Daniel (Modern Story - Modern Voices collection)
  'refugee-journey-1': ['A1'],  // A1 with Sarah (Modern Story - Modern Voices collection)
  'community-builder-1': ['A1'],  // A1 with Jane (Modern Story - Modern Voices collection)
  'disability-overcome-1': ['A1'],  // A1 with Daniel (Modern Story - Modern Voices collection)
  'career-pivot-1': ['A1'],  // A1 with Daniel (Modern Story - Modern Voices collection)
  'second-chance-1': ['A1'],  // A1 with Jane (Modern Story - Modern Voices collection)
};

// Single-level books configuration
export const SINGLE_LEVEL_BOOKS: { [key: string]: string } = {
  'great-gatsby-a2': 'A2',
  'gutenberg-1952-A1': 'A1',
  'sleepy-hollow-enhanced': 'A1',
  // 'the-necklace' removed - it's now in MULTI_LEVEL_BOOKS
};
