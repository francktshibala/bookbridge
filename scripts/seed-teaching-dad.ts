#!/usr/bin/env npx tsx

/**
 * Seed script for "First-Gen Student Teaching Dad to Read"
 * Adds to Modern Voices collection in catalog
 * 
 * Story: An eight-year-old girl becomes her father's teacher, helping him learn to read English
 * Source: Original narrative based on themes from GMA, Motherly, and TODAY
 * Themes: Intergenerational learning, role reversal, family dynamics, education, empowerment
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function convertGradient(tailwind: string): string {
  const colors: Record<string, Record<string, string>> = {
    orange: { '500': '#f97316', '600': '#ea580c' },
    amber: { '500': '#f59e0b', '600': '#d97706' },
    purple: { '500': '#a855f7', '600': '#9333ea' },
    indigo: { '500': '#6366f1', '600': '#4f46e5' },
    pink: { '500': '#ec4899', '600': '#db2777' },
    rose: { '500': '#f43f5e', '600': '#e11d48' },
    blue: { '500': '#3b82f6', '600': '#2563eb' },
    green: { '500': '#22c55e', '600': '#16a34a' },
    teal: { '500': '#14b8a6', '600': '#0d9488' },
    cyan: { '500': '#06b6d4', '600': '#0891b2' },
  };

  const match = tailwind.match(/from-(\w+)-(\d+)\s+to-(\w+)-(\d+)/);
  if (!match) return 'linear-gradient(135deg, #f97316 0%, #d97706 100%)';

  const [, color1, shade1, color2, shade2] = match;
  const hex1 = colors[color1]?.[shade1] || '#f97316';
  const hex2 = colors[color2]?.[shade2] || '#d97706';

  return `linear-gradient(135deg, ${hex1} 0%, ${hex2} 100%)`;
}

function getTeachingDadMetadata() {
  const genres: string[] = ['Modern Story', 'Inspirational', 'Family'];
  const themes: string[] = ['Intergenerational Learning', 'Role Reversal', 'Family Dynamics', 'Education', 'Empowerment', 'Patience', 'Breakthrough'];
  const moods: string[] = ['Heartwarming', 'Inspiring', 'Emotional', 'Empowering'];
  return { genres, themes, moods };
}

async function main() {
  console.log('🎤 Seeding "First-Gen Student Teaching Dad to Read" to Modern Voices Collection...\n');

  const storyId = 'teaching-dad-to-read';
  const metadata = getTeachingDadMetadata();

  // Assuming 155 sentences for A1 level, average 10 words/sentence, 80 WPM
  const sentences = 155;
  const bundles = 39; // 4 sentences per bundle
  const readingTime = Math.ceil((sentences * 10) / 80); // ~19 minutes

  const teachingDadStory = {
    id: storyId,
    title: 'First-Gen Student Teaching Dad to Read',
    author: 'BookBridge', // Original narrative based on extracted themes
    description: 'A heartwarming story of an eight-year-old girl who becomes her father\'s teacher, helping him learn to read English. Through patience, love, and determination, they discover that learning together can heal relationships and build unbreakable bonds. This inspiring tale shows how courage and compassion can transform a family. A1 level with Daniel voice.',
    sentences: sentences,
    bundles: bundles,
    gradient: 'from-orange-500 to-amber-600',
    abbreviation: 'TD'
  };

  const book = await prisma.featuredBook.upsert({
    where: { slug: teachingDadStory.id },
    create: {
      slug: teachingDadStory.id,
      title: teachingDadStory.title,
      author: teachingDadStory.author,
      description: teachingDadStory.description,
      sentences: teachingDadStory.sentences,
      bundles: teachingDadStory.bundles,
      gradient: convertGradient(teachingDadStory.gradient),
      abbreviation: teachingDadStory.abbreviation,
      genres: metadata.genres,
      themes: metadata.themes,
      moods: metadata.moods,
      readingTimeMinutes: readingTime,
      difficultyScore: 0.2, // A1 level - very easy
      popularityScore: 90,
      isClassic: false, // Modern Voices collection
      isFeatured: true,
      isNew: true,
    },
    update: {
      title: teachingDadStory.title,
      author: teachingDadStory.author,
      description: teachingDadStory.description,
      sentences: teachingDadStory.sentences,
      bundles: teachingDadStory.bundles,
      gradient: convertGradient(teachingDadStory.gradient),
      abbreviation: teachingDadStory.abbreviation,
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

  console.log('\n📦 Checking Modern Voices collection...');
  const collection = await prisma.bookCollection.upsert({
    where: { slug: 'modern-voices' },
    create: {
      slug: 'modern-voices',
      name: 'Modern Voices',
      description: 'Contemporary talks and essays from thought leaders - TED Talks, StoryCorps, and modern writers exploring psychology, personal growth, and human connection',
      icon: '🎤',
      type: 'collection',
      isPrimary: true,
      sortOrder: 0,
      isSmartCollection: false,
    },
    update: {},
  });
  console.log(`  ✅ ${collection.name} (${collection.icon})`);

  console.log('\n🔗 Linking book to collection...');
  const existingMemberships = await prisma.bookCollectionMembership.findMany({
    where: { collectionId: collection.id },
  });
  const sortOrder = existingMemberships.length;

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

  console.log('\n🎉 "First-Gen Student Teaching Dad to Read" seeded successfully!');
  console.log('\n💡 Next steps:');
  console.log('   1. Refresh your browser at http://localhost:3000/library');
  console.log('   2. Search for "modern voices" or "teaching dad"');
  console.log('   3. Click on "Modern Voices" collection filter');
  console.log('   4. Verify all content appears in the collection');
  console.log('   5. Test reading "First-Gen Student Teaching Dad to Read"');
}

main()
  .catch((error) => {
    console.error('❌ Error seeding Teaching Dad to Read:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

