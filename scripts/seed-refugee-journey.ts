#!/usr/bin/env npx tsx

/**
 * Seed script for "Refugee Journey: From War Zone to Hope"
 * Adds to Modern Voices collection in catalog
 * 
 * Story: A young refugee flees war and arrives in a new country with nothing, finding hope through resilience
 * Source: Original narrative based on themes from CBC, CNN, and Their Story is Our Story
 * Themes: Refugee journey, resilience, language barriers, building new life, finding belonging
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
  if (!match) return 'linear-gradient(135deg, #6366f1 0%, #2563eb 100%)';

  const [, color1, shade1, color2, shade2] = match;
  const hex1 = colors[color1]?.[shade1] || '#6366f1';
  const hex2 = colors[color2]?.[shade2] || '#2563eb';

  return `linear-gradient(135deg, ${hex1} 0%, ${hex2} 100%)`;
}

function getRefugeeJourneyMetadata() {
  const genres: string[] = ['Modern Story', 'Inspirational', 'Refugee Experience'];
  const themes: string[] = ['Refugee Journey', 'Resilience', 'Language Barriers', 'Building New Life', 'Finding Belonging', 'Transformation', 'Hope'];
  const moods: string[] = ['Powerful', 'Inspiring', 'Emotional', 'Hopeful'];
  return { genres, themes, moods };
}

async function main() {
  console.log('🎤 Seeding "Refugee Journey: From War Zone to Hope" to Modern Voices Collection...\n');

  const storyId = 'refugee-journey-1';
  const metadata = getRefugeeJourneyMetadata();

  // 252 sentences for A1 level, average 6.4 words/sentence, 80 WPM
  const sentences = 252;
  const bundles = 63; // 4 sentences per bundle
  const readingTime = Math.ceil((sentences * 6.4) / 80); // ~20 minutes

  const refugeeJourneyStory = {
    id: storyId,
    title: 'Refugee Journey: From War Zone to Hope',
    author: 'BookBridge', // Original narrative based on extracted themes
    description: 'A powerful story about a young refugee who flees war and arrives in a new country with nothing. Through language barriers, hard work, and moments of despair, she finds hope and transforms her life. This inspiring tale shows the resilience of refugees and the power of finding belonging. A1 level with Sarah voice.',
    sentences: sentences,
    bundles: bundles,
    gradient: 'from-indigo-500 to-blue-600',
    abbreviation: 'RJ'
  };

  const book = await prisma.featuredBook.upsert({
    where: { slug: refugeeJourneyStory.id },
    create: {
      slug: refugeeJourneyStory.id,
      title: refugeeJourneyStory.title,
      author: refugeeJourneyStory.author,
      description: refugeeJourneyStory.description,
      sentences: refugeeJourneyStory.sentences,
      bundles: refugeeJourneyStory.bundles,
      gradient: convertGradient(refugeeJourneyStory.gradient),
      abbreviation: refugeeJourneyStory.abbreviation,
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
      title: refugeeJourneyStory.title,
      author: refugeeJourneyStory.author,
      description: refugeeJourneyStory.description,
      sentences: refugeeJourneyStory.sentences,
      bundles: refugeeJourneyStory.bundles,
      gradient: convertGradient(refugeeJourneyStory.gradient),
      abbreviation: refugeeJourneyStory.abbreviation,
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

  console.log('\n🎉 "Refugee Journey: From War Zone to Hope" seeded successfully!');
  console.log('\n💡 Next steps:');
  console.log('   1. Refresh your browser at http://localhost:3000/library');
  console.log('   2. Search for "modern voices" or "refugee journey"');
  console.log('   3. Click on "Modern Voices" collection filter');
  console.log('   4. Verify all content appears in the collection');
  console.log('   5. Test reading "Refugee Journey: From War Zone to Hope"');
}

main()
  .catch((error) => {
    console.error('❌ Error seeding Refugee Journey:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

