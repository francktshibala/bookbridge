#!/usr/bin/env npx tsx

/**
 * Seed script for "How Great Leaders Inspire Action" TED Talk
 * Adds to Modern Voices collection in catalog
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Helper to convert Tailwind gradient to CSS gradient
function convertGradient(tailwind: string): string {
  const colors: Record<string, Record<string, string>> = {
    blue: { '500': '#3b82f6', '600': '#2563eb' },
    indigo: { '500': '#6366f1', '600': '#4f46e5' },
  };

  const match = tailwind.match(/from-(\w+)-(\d+)\s+to-(\w+)-(\d+)/);
  if (!match) return 'linear-gradient(135deg, #3b82f6 0%, #4f46e5 100%)';

  const [, color1, shade1, color2, shade2] = match;
  const hex1 = colors[color1]?.[shade1] || '#3b82f6';
  const hex2 = colors[color2]?.[shade2] || '#4f46e5';

  return `linear-gradient(135deg, ${hex1} 0%, ${hex2} 100%)`;
}

// Infer metadata from TED Talk description
function inferTEDMetadata(title: string, description: string) {
  const desc = description.toLowerCase();

  // Genres from curation file: Leadership, Business, Motivation
  const genres: string[] = ['Leadership', 'Business', 'Motivation'];

  // Themes (from curation: Leadership, purpose, inspiration)
  const themes: string[] = ['Leadership', 'Purpose', 'Inspiration'];
  if (desc.includes('circle') || desc.includes('golden')) themes.push('Strategy', 'Innovation');

  // Moods from curation file: Inspiring, Thought-provoking, Practical
  const moods: string[] = ['Inspiring', 'Thought-provoking', 'Practical'];

  return { genres, themes, moods };
}

async function main() {
  console.log('🎤 Seeding "How Great Leaders Inspire Action" to Modern Voices Collection...\n');

  // 1. Create the TED Talk FeaturedBook
  console.log('📚 Creating "How Great Leaders Inspire Action" TED Talk...');

  const tedTalk = {
    id: 'how-great-leaders-inspire-action',
    title: 'How Great Leaders Inspire Action',
    author: 'Simon Sinek',
    description: 'Transformative TED Talk about the Golden Circle: Why, How, and What. Learn why great leaders like Apple, Wright Brothers, and MLK inspire action by starting with purpose. A1 level with Daniel voice narration.',
    sentences: 85,
    bundles: 22,
    gradient: 'from-blue-500 to-indigo-600',
    abbreviation: 'GL'
  };

  const metadata = inferTEDMetadata(tedTalk.title, tedTalk.description);
  const readingTime = Math.ceil((tedTalk.sentences * 15) / 200); // ~7 minutes

  const book = await prisma.featuredBook.upsert({
    where: { slug: tedTalk.id },
    create: {
      slug: tedTalk.id,
      title: tedTalk.title,
      author: tedTalk.author,
      description: tedTalk.description,
      sentences: tedTalk.sentences,
      bundles: tedTalk.bundles,
      gradient: convertGradient(tedTalk.gradient),
      abbreviation: tedTalk.abbreviation,
      genres: metadata.genres,
      themes: metadata.themes,
      moods: metadata.moods,
      readingTimeMinutes: readingTime,
      difficultyScore: 0.3, // A1 level - easier
      popularityScore: 93, // High priority - third in Modern Voices
      isClassic: false, // Modern content
      isFeatured: true,
      isNew: true, // Mark as new
    },
    update: {
      title: tedTalk.title,
      author: tedTalk.author,
      description: tedTalk.description,
      sentences: tedTalk.sentences,
      bundles: tedTalk.bundles,
      gradient: convertGradient(tedTalk.gradient),
      abbreviation: tedTalk.abbreviation,
      genres: metadata.genres,
      themes: metadata.themes,
      moods: metadata.moods,
      readingTimeMinutes: readingTime,
      difficultyScore: 0.3,
      popularityScore: 93,
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

  // 3. Link TED Talk to Modern Voices collection
  console.log('\n🔗 Linking book to collection...');

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
      sortOrder: 2, // Third book in collection (after Power of Vulnerability and Danger of Single Story)
    },
    update: {
      sortOrder: 2,
    },
  });

  console.log(`  ✅ "${book.title}" → "${collection.name}"`);

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

  console.log('\n🎉 "How Great Leaders Inspire Action" seeded successfully!');
  console.log('\n💡 Next steps:');
  console.log('   1. Refresh your browser at http://localhost:3000/library');
  console.log('   2. Search for "modern voices" or "great leaders" or "simon sinek"');
  console.log('   3. Click on "Modern Voices" collection filter');
  console.log('   4. Verify all TED Talks appear in the collection');
  console.log('   5. Test reading "How Great Leaders Inspire Action"');
}

main()
  .catch((error) => {
    console.error('❌ Error seeding How Great Leaders Inspire Action:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
