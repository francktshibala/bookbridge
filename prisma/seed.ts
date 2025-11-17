/**
 * Seed script for book catalog system
 * Populates FeaturedBook and BookCollection tables with initial data
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Helper to convert Tailwind gradient to CSS gradient
function convertGradient(tailwind: string): string {
  // Convert "from-purple-500 to-pink-600" to CSS gradient
  const match = tailwind.match(/from-(\w+)-(\d+)\s+to-(\w+)-(\d+)/);
  if (!match) return 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';

  const [, color1, shade1, color2, shade2] = match;

  // Tailwind color mappings (simplified)
  const colors: Record<string, Record<string, string>> = {
    purple: { '500': '#a855f7', '600': '#9333ea' },
    pink: { '500': '#ec4899', '600': '#db2777' },
    blue: { '500': '#3b82f6', '600': '#2563eb' },
    indigo: { '500': '#6366f1', '600': '#4f46e5' },
    gray: { '500': '#6b7280', '600': '#4b5563' },
    slate: { '500': '#64748b', '600': '#475569' },
    red: { '500': '#ef4444', '600': '#dc2626' },
    green: { '500': '#22c55e', '600': '#16a34a' },
    teal: { '500': '#14b8a6', '600': '#0d9488' },
    yellow: { '500': '#eab308', '600': '#ca8a04' },
    amber: { '500': '#f59e0b', '600': '#d97706' },
    orange: { '500': '#f97316', '600': '#ea580c' },
  };

  const hex1 = colors[color1]?.[shade1] || '#667eea';
  const hex2 = colors[color2]?.[shade2] || '#764ba2';

  return `linear-gradient(135deg, ${hex1} 0%, ${hex2} 100%)`;
}

// Infer metadata from book descriptions
function inferMetadata(title: string, author: string, description: string) {
  const desc = description.toLowerCase();
  const titleLower = title.toLowerCase();

  // Genres
  const genres: string[] = [];
  if (desc.includes('gothic') || desc.includes('horror') || desc.includes('spooky')) genres.push('Gothic', 'Horror');
  if (desc.includes('romance') || desc.includes('love')) genres.push('Romance');
  if (desc.includes('psychological') || desc.includes('psycho')) genres.push('Psychological Fiction');
  if (desc.includes('realism') || desc.includes('realistic')) genres.push('Literary Realism');
  if (desc.includes('modernist')) genres.push('Modernism');
  if (desc.includes('absurdist')) genres.push('Absurdist Fiction');
  if (desc.includes('moral') || desc.includes('fairy tale')) genres.push('Moral Tale');
  if (desc.includes('christmas')) genres.push('Holiday Fiction');
  if (genres.length === 0) genres.push('Classic Literature');

  // Themes
  const themes: string[] = [];
  if (desc.includes('love') || desc.includes('romance')) themes.push('Love');
  if (desc.includes('memory') || desc.includes('past')) themes.push('Memory');
  if (desc.includes('mortality') || desc.includes('death')) themes.push('Mortality');
  if (desc.includes('transformation') || desc.includes('change')) themes.push('Transformation');
  if (desc.includes('alienation') || desc.includes('isolation')) themes.push('Alienation');
  if (desc.includes('desire') || desc.includes('sacrifice')) themes.push('Desire', 'Sacrifice');
  if (desc.includes('friendship')) themes.push('Friendship');
  if (desc.includes('deception') || desc.includes('mystery')) themes.push('Deception');
  if (themes.length === 0) themes.push('Human Nature');

  // Moods
  const moods: string[] = [];
  if (desc.includes('heartwarming')) moods.push('heartwarming');
  if (desc.includes('emotional')) moods.push('emotional');
  if (desc.includes('suspenseful') || desc.includes('spooky')) moods.push('suspenseful');
  if (desc.includes('melancholic') || desc.includes('somber')) moods.push('melancholic');
  if (desc.includes('poignant') || desc.includes('powerful')) moods.push('poignant');
  if (desc.includes('dark') || desc.includes('gothic')) moods.push('dark');
  if (desc.includes('reflective')) moods.push('reflective');
  if (moods.length === 0) moods.push('contemplative');

  return { genres, themes, moods };
}

// Calculate reading time (average 200 words per minute, ~15 words per sentence)
function calculateReadingTime(sentences: number): number {
  const wordsPerSentence = 15;
  const wordsPerMinute = 200;
  return Math.ceil((sentences * wordsPerSentence) / wordsPerMinute);
}

async function main() {
  console.log('🌱 Starting seed...');

  // Book data from featured-books/page.tsx
  const books = [
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
    {
      id: 'lady-with-dog',
      title: 'The Lady with the Dog',
      author: 'Anton Chekhov',
      description: 'Psychological masterpiece about unexpected love. A1 level with Sarah voice narration across 6 thematic chapters.',
      sentences: 349,
      bundles: 88,
      gradient: 'from-blue-500 to-purple-600',
      abbreviation: 'LD'
    },
    {
      id: 'gift-of-the-magi',
      title: 'The Gift of the Magi',
      author: 'O. Henry',
      description: 'Heartwarming Christmas story with Sarah voice narration. A1 level with 6 thematic chapters. Complete 13 bundles available.',
      sentences: 51,
      bundles: 13,
      gradient: 'from-red-500 to-green-600',
      abbreviation: 'GM'
    },
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
      title: 'Dr. Jekyll and Mr. Hyde',
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

  // Upsert books
  console.log('📚 Seeding books...');
  for (const book of books) {
    const metadata = inferMetadata(book.title, book.author, book.description);
    const readingTime = calculateReadingTime(book.sentences);

    await prisma.featuredBook.upsert({
      where: { slug: book.id },
      create: {
        slug: book.id,
        title: book.title,
        author: book.author,
        description: book.description,
        sentences: book.sentences,
        bundles: book.bundles,
        gradient: convertGradient(book.gradient),
        abbreviation: book.abbreviation,
        genres: metadata.genres,
        themes: metadata.themes,
        moods: metadata.moods,
        readingTimeMinutes: readingTime,
        difficultyScore: 0.5,
        popularityScore: 100 - (books.indexOf(book) * 5), // Higher for earlier books
        isClassic: true,
        isFeatured: true,
        isNew: false,
      },
      update: {
        title: book.title,
        author: book.author,
        description: book.description,
        sentences: book.sentences,
        bundles: book.bundles,
        gradient: convertGradient(book.gradient),
        abbreviation: book.abbreviation,
        genres: metadata.genres,
        themes: metadata.themes,
        moods: metadata.moods,
        readingTimeMinutes: readingTime,
        difficultyScore: 0.5,
        popularityScore: 100 - (books.indexOf(book) * 5),
        isClassic: true,
        isFeatured: true,
        isNew: false,
      },
    });

    console.log(`  ✅ ${book.title}`);
  }

  // Create collections
  console.log('\n📦 Creating collections...');

  const collections = [
    {
      slug: 'classics',
      name: 'Classic Literature',
      description: 'Timeless masterpieces from literary giants',
      icon: '📚',
      type: 'genre',
      isPrimary: true,
      sortOrder: 1,
      bookSlugs: ['the-necklace', 'the-dead', 'the-metamorphosis', 'lady-with-dog', 'great-gatsby-a2', 'gutenberg-43', 'sleepy-hollow-enhanced']
    },
    {
      slug: 'quick-reads',
      name: 'Quick Reads',
      description: 'Stories you can finish in under 30 minutes',
      icon: '⚡',
      type: 'reading-time',
      isPrimary: true,
      sortOrder: 2,
      bookSlugs: ['the-necklace', 'gift-of-the-magi', 'the-devoted-friend', 'gutenberg-43']
    },
    {
      slug: 'romance',
      name: 'Love Stories',
      description: 'Tales of love, loss, and longing',
      icon: '💕',
      type: 'genre',
      isPrimary: false,
      sortOrder: 3,
      bookSlugs: ['lady-with-dog', 'gift-of-the-magi', 'great-gatsby-a2']
    },
    {
      slug: 'psychological',
      name: 'Psychological Fiction',
      description: 'Deep dives into the human mind',
      icon: '🧠',
      type: 'genre',
      isPrimary: false,
      sortOrder: 4,
      bookSlugs: ['the-metamorphosis', 'gutenberg-1952-A1', 'lady-with-dog', 'the-dead']
    },
    {
      slug: 'gothic-horror',
      name: 'Gothic & Horror',
      description: 'Dark tales that chill the soul',
      icon: '👻',
      type: 'genre',
      isPrimary: false,
      sortOrder: 5,
      bookSlugs: ['gutenberg-43', 'sleepy-hollow-enhanced']
    },
  ];

  for (const col of collections) {
    const collection = await prisma.bookCollection.upsert({
      where: { slug: col.slug },
      create: {
        slug: col.slug,
        name: col.name,
        description: col.description,
        icon: col.icon,
        type: col.type,
        isPrimary: col.isPrimary,
        sortOrder: col.sortOrder,
      },
      update: {
        name: col.name,
        description: col.description,
        icon: col.icon,
        type: col.type,
        isPrimary: col.isPrimary,
        sortOrder: col.sortOrder,
      },
    });

    // Create collection memberships
    for (const bookSlug of col.bookSlugs) {
      const book = await prisma.featuredBook.findUnique({
        where: { slug: bookSlug },
      });

      if (book) {
        await prisma.bookCollectionMembership.upsert({
          where: {
            bookId_collectionId: {
              bookId: book.id,
              collectionId: collection.id,
            },
          },
          create: {
            collectionId: collection.id,
            bookId: book.id,
            sortOrder: col.bookSlugs.indexOf(bookSlug),
          },
          update: {
            sortOrder: col.bookSlugs.indexOf(bookSlug),
          },
        });
      }
    }

    console.log(`  ✅ ${col.name} (${col.bookSlugs.length} books)`);
  }

  console.log('\n✅ Seed completed!');
  console.log('\n📊 Summary:');
  console.log(`  - Books: ${books.length}`);
  console.log(`  - Collections: ${collections.length}`);
  console.log('\n🎉 You can now visit http://localhost:3000/catalog');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
