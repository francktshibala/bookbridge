#!/usr/bin/env npx tsx

/**
 * Seed script for Helen Keller's "The Story of My Life" (Chapters III-IV)
 * Adds to Modern Voices collection in catalog
 * 
 * Story: Helen Keller's breakthrough moment learning language at age 7
 * Source: Project Gutenberg (public domain memoir, 1903)
 * Excerpt: Chapters III-IV (coherent narrative about her transformation)
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Helper to convert Tailwind gradient to CSS gradient
function convertGradient(tailwind: string): string {
  const colors: Record<string, Record<string, string>> = {
    purple: { '500': '#a855f7', '600': '#9333ea' },
    indigo: { '500': '#6366f1', '600': '#4f46e5' },
  };

  const match = tailwind.match(/from-(\w+)-(\d+)\s+to-(\w+)-(\d+)/);
  if (!match) return 'linear-gradient(135deg, #a855f7 0%, #4f46e5 100%)';

  const [, color1, shade1, color2, shade2] = match;
  const hex1 = colors[color1]?.[shade1] || '#a855f7';
  const hex2 = colors[color2]?.[shade2] || '#4f46e5';

  return `linear-gradient(135deg, ${hex1} 0%, ${hex2} 100%)`;
}

// Metadata for Helen Keller memoir
function getHelenKellerMetadata() {
  // Genres: Memoir, Inspirational, Education
  const genres: string[] = ['Memoir', 'Inspirational', 'Education'];

  // Themes: Perseverance, Education, Communication, Transformation, Hope
  const themes: string[] = ['Perseverance', 'Education', 'Communication', 'Transformation', 'Hope', 'Breakthrough'];

  // Moods: Inspiring, Heartwarming, Hopeful, Emotional
  const moods: string[] = ['Inspiring', 'Heartwarming', 'Hopeful', 'Emotional'];

  return { genres, themes, moods };
}

async function main() {
  console.log('🎤 Seeding Helen Keller\'s "The Story of My Life" to Modern Voices Collection...\n');

  // 1. Create the Helen Keller FeaturedBook
  console.log('📚 Creating Helen Keller memoir...');

  const helenKeller = {
    id: 'helen-keller',
    title: 'The Story of My Life',
    author: 'Helen Keller',
    description: 'The inspiring true story of Helen Keller\'s breakthrough moment learning language at age 7. After years of frustration and isolation, Anne Sullivan arrives and teaches Helen that words have meaning. A powerful memoir about transformation, hope, and the power of education. A1 level with Jane voice.',
    sentences: 117,
    bundles: 30,
    gradient: 'from-purple-500 to-indigo-600',
    abbreviation: 'HK'
  };

  const metadata = getHelenKellerMetadata();
  const readingTime = Math.ceil((helenKeller.sentences * 15) / 200); // ~9 minutes

  const book = await prisma.featuredBook.upsert({
    where: { slug: helenKeller.id },
    create: {
      slug: helenKeller.id,
      title: helenKeller.title,
      author: helenKeller.author,
      description: helenKeller.description,
      sentences: helenKeller.sentences,
      bundles: helenKeller.bundles,
      gradient: convertGradient(helenKeller.gradient),
      abbreviation: helenKeller.abbreviation,
      genres: metadata.genres,
      themes: metadata.themes,
      moods: metadata.moods,
      readingTimeMinutes: readingTime,
      difficultyScore: 0.2, // A1 level - very easy
      popularityScore: 95, // High priority - classic inspirational memoir
      isClassic: false, // Modern Voices collection (even though source is classic, it's curated as modern content)
      isFeatured: true,
      isNew: true, // Mark as new
    },
    update: {
      title: helenKeller.title,
      author: helenKeller.author,
      description: helenKeller.description,
      sentences: helenKeller.sentences,
      bundles: helenKeller.bundles,
      gradient: convertGradient(helenKeller.gradient),
      abbreviation: helenKeller.abbreviation,
      genres: metadata.genres,
      themes: metadata.themes,
      moods: metadata.moods,
      readingTimeMinutes: readingTime,
      difficultyScore: 0.2,
      popularityScore: 95,
      isClassic: false,
      isFeatured: true,
      isNew: true,
    },
  });

  console.log(`  ✅ ${book.title} by ${book.author}`);
  console.log(`     • ${book.sentences} sentences across ${book.bundles} bundles`);
  console.log(`     • Reading time: ${book.readingTimeMinutes} minutes`);
  console.log(`     • Genres: ${metadata.genres.join(', ')}`);
  console.log(`     • Themes: ${metadata.themes.join(', ')}`);
  console.log(`     • Moods: ${metadata.moods.join(', ')}`);

  // 2. Get or verify Modern Voices collection exists
  console.log('\n📦 Checking Modern Voices collection...');

  const collection = await prisma.bookCollection.upsert({
    where: { slug: 'modern-voices' },
    create: {
      slug: 'modern-voices',
      name: 'Modern Voices',
      description: 'Contemporary talks and essays from thought leaders - TED Talks, StoryCorps, and modern writers exploring psychology, personal growth, and human connection',
      icon: '🎤',
      type: 'collection',
      isPrimary: true, // Show prominently
      sortOrder: 0, // First in list
      isSmartCollection: false,
    },
    update: {},
  });

  console.log(`  ✅ ${collection.name} (${collection.icon})`);

  // 3. Link Helen Keller to Modern Voices collection
  console.log('\n🔗 Linking book to collection...');

  // Count existing books in collection to determine sortOrder
  const existingMemberships = await prisma.bookCollectionMembership.findMany({
    where: { collectionId: collection.id },
  });

  const sortOrder = existingMemberships.length; // Add at end of collection

  await prisma.bookCollectionMembership.upsert({
    where: {
      bookId_collectionId: {
        bookId: book.id,
        collectionId: collection.id,
      },
    },
    create: {
      bookId: book.id,
      collectionId: collection.id,
      sortOrder: sortOrder,
    },
    update: {
      sortOrder: sortOrder,
    },
  });

  console.log(`  ✅ "${book.title}" → "${collection.name}" (position ${sortOrder + 1})`);

  // 4. Verify results
  console.log('\n✅ Verification...');

  const modernVoicesBooks = await prisma.bookCollectionMembership.findMany({
    where: { collectionId: collection.id },
    include: { featuredBook: true },
    orderBy: { sortOrder: 'asc' },
  });

  console.log(`  📚 Books in Modern Voices: ${modernVoicesBooks.length}`);
  modernVoicesBooks.forEach((membership, index) => {
    console.log(`     ${index + 1}. ${membership.featuredBook.title} by ${membership.featuredBook.author}`);
  });

  console.log('\n🎉 Helen Keller\'s "The Story of My Life" seeded successfully!');
  console.log('\n💡 Next steps:');
  console.log('   1. Refresh your browser at http://localhost:3000/library');
  console.log('   2. Search for "modern voices" or "helen keller"');
  console.log('   3. Click on "Modern Voices" collection filter');
  console.log('   4. Verify all content appears in the collection');
  console.log('   5. Test reading "The Story of My Life"');
}

main()
  .catch((error) => {
    console.error('❌ Error seeding Helen Keller:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

