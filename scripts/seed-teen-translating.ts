#!/usr/bin/env npx tsx

/**
 * Seed script for "A Lifeline: Teen Translating for Parents Through Hospital Chaos"
 * Adds to Modern Voices collection in catalog
 * 
 * Story: A 14-year-old girl becomes her family's translator during a medical emergency
 * Source: Original narrative based on themes from Chalkbeat, NPR Youth Radio, and KQED
 * Themes: Language barriers, medical emergencies, teen advocacy, confidence building
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Helper to convert Tailwind gradient to CSS gradient
function convertGradient(tailwind: string): string {
  const colors: Record<string, Record<string, string>> = {
    teal: { '500': '#14b8a6', '600': '#0d9488' },
    cyan: { '500': '#06b6d4', '600': '#0891b2' },
  };

  const match = tailwind.match(/from-(\w+)-(\d+)\s+to-(\w+)-(\d+)/);
  if (!match) return 'linear-gradient(135deg, #14b8a6 0%, #0891b2 100%)';

  const [, color1, shade1, color2, shade2] = match;
  const hex1 = colors[color1]?.[shade1] || '#14b8a6';
  const hex2 = colors[color2]?.[shade2] || '#0891b2';

  return `linear-gradient(135deg, ${hex1} 0%, ${hex2} 100%)`;
}

// Metadata for Teen Translating story
function getTeenTranslatingMetadata() {
  // Genres: Modern Story, Inspirational, Real-life
  const genres: string[] = ['Modern Story', 'Inspirational', 'Real-life'];

  // Themes: Language Barriers, Medical Emergencies, Teen Advocacy, Confidence Building, Responsibility, Courage
  const themes: string[] = ['Language Barriers', 'Medical Emergencies', 'Teen Advocacy', 'Confidence Building', 'Responsibility', 'Courage', 'Family'];

  // Moods: Inspiring, Emotional, Heartwarming, Empowering
  const moods: string[] = ['Inspiring', 'Emotional', 'Heartwarming', 'Empowering'];

  return { genres, themes, moods };
}

async function main() {
  console.log('🎤 Seeding "A Lifeline: Teen Translating for Parents Through Hospital Chaos" to Modern Voices Collection...\n');

  // 1. Create the Teen Translating FeaturedBook
  console.log('📚 Creating Teen Translating story...');

  const teenTranslating = {
    id: 'teen-translating-hospital',
    title: 'A Lifeline: Teen Translating for Parents Through Hospital Chaos',
    author: 'BookBridge',
    description: 'A powerful story about a 14-year-old girl who becomes her family\'s translator during a medical emergency. When her sister needs help at the hospital, she must translate between English and Spanish. This inspiring narrative explores courage, responsibility, and discovering your own strength. A1 level with Jane voice.',
    sentences: 185,
    bundles: 47,
    gradient: 'from-teal-500 to-cyan-600',
    abbreviation: 'TT'
  };

  const metadata = getTeenTranslatingMetadata();
  const readingTime = Math.ceil((teenTranslating.sentences * 15) / 200); // ~14 minutes

  const book = await prisma.featuredBook.upsert({
    where: { slug: teenTranslating.id },
    create: {
      slug: teenTranslating.id,
      title: teenTranslating.title,
      author: teenTranslating.author,
      description: teenTranslating.description,
      sentences: teenTranslating.sentences,
      bundles: teenTranslating.bundles,
      gradient: convertGradient(teenTranslating.gradient),
      abbreviation: teenTranslating.abbreviation,
      genres: metadata.genres,
      themes: metadata.themes,
      moods: metadata.moods,
      readingTimeMinutes: readingTime,
      difficultyScore: 0.2, // A1 level - very easy
      popularityScore: 90, // High priority - modern, relatable story
      isClassic: false, // Modern Voices collection
      isFeatured: true,
      isNew: true, // Mark as new
    },
    update: {
      title: teenTranslating.title,
      author: teenTranslating.author,
      description: teenTranslating.description,
      sentences: teenTranslating.sentences,
      bundles: teenTranslating.bundles,
      gradient: convertGradient(teenTranslating.gradient),
      abbreviation: teenTranslating.abbreviation,
      genres: metadata.genres,
      themes: metadata.themes,
      moods: metadata.moods,
      readingTimeMinutes: readingTime,
      difficultyScore: 0.2,
      popularityScore: 90,
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

  // 3. Link Teen Translating to Modern Voices collection
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

  console.log('\n🎉 "A Lifeline: Teen Translating for Parents Through Hospital Chaos" seeded successfully!');
  console.log('\n💡 Next steps:');
  console.log('   1. Refresh your browser at http://localhost:3000/library');
  console.log('   2. Search for "modern voices" or "teen translating"');
  console.log('   3. Click on "Modern Voices" collection filter');
  console.log('   4. Verify all content appears in the collection');
  console.log('   5. Test reading "A Lifeline: Teen Translating for Parents Through Hospital Chaos"');
}

main()
  .catch((error) => {
    console.error('❌ Error seeding Teen Translating:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

