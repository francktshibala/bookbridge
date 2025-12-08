#!/usr/bin/env npx tsx

/**
 * Seed script for "Immigrant Entrepreneur: From Failure to Success"
 * Adds to Modern Voices collection in catalog
 * 
 * Story: Immigrant entrepreneurs who lost everything but rebuilt their dreams
 * Source: Original narrative based on themes from 6 sources (Saul Chavez, Ibrahim, Serra Semi, Pinsi Lei, Jen Ngozi)
 * Themes: Immigration, entrepreneurship, resilience, overcoming adversity, building new life
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function convertGradient(tailwind: string): string {
  const colors: Record<string, Record<string, string>> = {
    green: { '500': '#22c55e', '600': '#16a34a' },
    emerald: { '500': '#10b981', '600': '#059669' },
    orange: { '500': '#f97316', '600': '#ea580c' },
    amber: { '500': '#f59e0b', '600': '#d97706' },
    purple: { '500': '#a855f7', '600': '#9333ea' },
    indigo: { '500': '#6366f1', '600': '#4f46e5' },
    pink: { '500': '#ec4899', '600': '#db2777' },
    rose: { '500': '#f43f5e', '600': '#e11d48' },
    blue: { '500': '#3b82f6', '600': '#2563eb' },
    teal: { '500': '#14b8a6', '600': '#0d9488' },
    cyan: { '500': '#06b6d4', '600': '#0891b2' },
  };

  const match = tailwind.match(/from-(\w+)-(\d+)\s+to-(\w+)-(\d+)/);
  if (!match) return 'linear-gradient(135deg, #22c55e 0%, #059669 100%)';

  const [, color1, shade1, color2, shade2] = match;
  const hex1 = colors[color1]?.[shade1] || '#22c55e';
  const hex2 = colors[color2]?.[shade2] || '#059669';

  return `linear-gradient(135deg, ${hex1} 0%, ${hex2} 100%)`;
}

function getImmigrantEntrepreneurMetadata() {
  const genres: string[] = ['Modern Story', 'Inspirational', 'Business', 'Immigration'];
  const themes: string[] = ['Immigration', 'Entrepreneurship', 'Resilience', 'Overcoming Adversity', 'Building New Life', 'Community Support', 'Transformation'];
  const moods: string[] = ['Inspiring', 'Empowering', 'Resilient', 'Hopeful'];
  return { genres, themes, moods };
}

async function main() {
  console.log('🎤 Seeding "Immigrant Entrepreneur: From Failure to Success" to Modern Voices Collection...\n');

  const storyId = 'immigrant-entrepreneur';
  const metadata = getImmigrantEntrepreneurMetadata();

  // 160 sentences for A1 level, average 10 words/sentence, 80 WPM
  const sentences = 160;
  const bundles = 40; // 4 sentences per bundle
  const readingTime = Math.ceil((sentences * 10) / 80); // ~20 minutes

  const immigrantEntrepreneurStory = {
    id: storyId,
    title: 'Immigrant Entrepreneur: From Failure to Success',
    author: 'BookBridge', // Original narrative based on extracted themes
    description: 'A powerful story about immigrant entrepreneurs who lost everything—to fire, to war, to financial struggles—but refused to give up. Through hard work, community support, and unwavering determination, they rebuilt their dreams and found success. This inspiring tale shows that sometimes, losing everything is the beginning of something even greater. A1 level with Daniel voice.',
    sentences: sentences,
    bundles: bundles,
    gradient: 'from-green-500 to-emerald-600',
    abbreviation: 'IE'
  };

  const book = await prisma.featuredBook.upsert({
    where: { slug: immigrantEntrepreneurStory.id },
    create: {
      slug: immigrantEntrepreneurStory.id,
      title: immigrantEntrepreneurStory.title,
      author: immigrantEntrepreneurStory.author,
      description: immigrantEntrepreneurStory.description,
      sentences: immigrantEntrepreneurStory.sentences,
      bundles: immigrantEntrepreneurStory.bundles,
      gradient: convertGradient(immigrantEntrepreneurStory.gradient),
      abbreviation: immigrantEntrepreneurStory.abbreviation,
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
      title: immigrantEntrepreneurStory.title,
      author: immigrantEntrepreneurStory.author,
      description: immigrantEntrepreneurStory.description,
      sentences: immigrantEntrepreneurStory.sentences,
      bundles: immigrantEntrepreneurStory.bundles,
      gradient: convertGradient(immigrantEntrepreneurStory.gradient),
      abbreviation: immigrantEntrepreneurStory.abbreviation,
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

  // Get or verify Modern Voices collection exists
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

  // Link book to Modern Voices collection
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

  // Verify results
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

  console.log('\n🎉 "Immigrant Entrepreneur: From Failure to Success" seeded successfully!');
  console.log('\n💡 Next steps:');
  console.log('   1. Refresh your browser at http://localhost:3000/library');
  console.log('   2. Search for "immigrant entrepreneur" or "modern voices"');
  console.log('   3. Click on "Modern Voices" collection filter');
  console.log('   4. Verify all content appears in the collection');
  console.log('   5. Test reading "Immigrant Entrepreneur: From Failure to Success"');
}

main()
  .catch((error) => {
    console.error('❌ Error seeding Immigrant Entrepreneur:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

