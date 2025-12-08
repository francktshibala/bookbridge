#!/usr/bin/env npx tsx

/**
 * Seed script for José Hernández Biography
 * Adds biography to Modern Voices collection
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Helper to convert Tailwind gradient to CSS gradient
function convertGradient(tailwind: string): string {
  const colors: Record<string, Record<string, string>> = {
    orange: { '500': '#f97316', '600': '#ea580c' },
    blue: { '500': '#3b82f6', '600': '#2563eb' },
    purple: { '500': '#a855f7', '600': '#9333ea' },
  };

  const match = tailwind.match(/from-(\w+)-(\d+)\s+to-(\w+)-(\d+)/);
  if (!match) return 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)';

  const [, color1, shade1, color2, shade2] = match;
  const hex1 = colors[color1]?.[shade1] || '#f97316';
  const hex2 = colors[color2]?.[shade2] || '#ea580c';

  return `linear-gradient(135deg, ${hex1} 0%, ${hex2} 100%)`;
}

// Infer metadata from biography
function inferBiographyMetadata(title: string, description: string) {
  const desc = description.toLowerCase();

  // Genres: Biography, Inspiration, Immigration Story
  const genres: string[] = ['Biography', 'Inspiration', 'Immigration Story'];

  // Themes
  const themes: string[] = [];
  if (desc.includes('migrant') || desc.includes('farmworker')) themes.push('Immigration', 'Migrant Workers');
  if (desc.includes('astronaut') || desc.includes('nasa')) themes.push('Space Exploration', 'Achievement');
  if (desc.includes('education') || desc.includes('school')) themes.push('Education', 'Perseverance');
  if (desc.includes('reject') || desc.includes('11 times')) themes.push('Resilience', 'Determination');

  // Moods: Inspiring, Uplifting, Determined
  const moods: string[] = ['Inspiring', 'Uplifting', 'Determined', 'Hopeful'];

  return { genres, themes, moods };
}

async function main() {
  console.log('🚀 Seeding José Hernández Biography...\n');

  // 1. Create the Biography FeaturedBook
  console.log('📚 Creating José Hernández biography...');

  const biography = {
    id: 'jose-hernandez',
    title: 'José Hernández: From Farmworker to Astronaut',
    author: 'Biography',
    description: 'Inspiring true story of a migrant farmworker who was rejected by NASA 11 times before finally becoming an astronaut. A1 level with Jane voice narration. Perfect for ESL learners who dream big.',
    sentences: 64, // Trimmed to focus on core story (farmworker → astronaut)
    bundles: 16, // 64 sentences / 4 = 16 bundles
    gradient: 'from-orange-500 to-blue-600',
    abbreviation: 'JH'
  };

  const metadata = inferBiographyMetadata(biography.title, biography.description);
  const readingTime = Math.ceil((biography.sentences * 15) / 200); // ~4-5 minutes for A1

  const book = await prisma.featuredBook.upsert({
    where: { slug: biography.id },
    create: {
      slug: biography.id,
      title: biography.title,
      author: biography.author,
      description: biography.description,
      sentences: biography.sentences,
      bundles: biography.bundles,
      gradient: convertGradient(biography.gradient),
      abbreviation: biography.abbreviation,
      genres: metadata.genres,
      themes: metadata.themes,
      moods: metadata.moods,
      readingTimeMinutes: readingTime,
      difficultyScore: 0.3, // A1 level - easier
      popularityScore: 98, // Very high priority - top story
      isClassic: false, // Modern content
      isFeatured: true,
      isNew: true, // Mark as new
    },
    update: {
      title: biography.title,
      author: biography.author,
      description: biography.description,
      sentences: biography.sentences,
      bundles: biography.bundles,
      gradient: convertGradient(biography.gradient),
      abbreviation: biography.abbreviation,
      genres: metadata.genres,
      themes: metadata.themes,
      moods: metadata.moods,
      readingTimeMinutes: readingTime,
      difficultyScore: 0.3,
      popularityScore: 98,
      isClassic: false,
      isFeatured: true,
      isNew: true,
    },
  });

  console.log(`  ✅ ${book.title} by ${book.author}`);
  console.log(`     • ${book.sentences} sentences across ${book.bundles} bundles`);
  console.log(`     • Reading time: ${book.readingTimeMinutes} minutes`);
  console.log(`     • Genres: ${metadata.genres.join(', ')}`);

  // 2. Ensure Modern Voices collection exists
  console.log('\n📦 Ensuring Modern Voices collection exists...');

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
    update: {
      name: 'Modern Voices',
      description: 'Contemporary talks and essays from thought leaders - TED Talks, StoryCorps, and modern writers exploring psychology, personal growth, and human connection',
      icon: '🎤',
      type: 'collection',
      isPrimary: true,
      sortOrder: 0,
    },
  });

  console.log(`  ✅ ${collection.name} (${collection.icon})`);

  // 3. Link Biography to Modern Voices collection
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
      sortOrder: 0, // First book in collection (or adjust based on existing)
    },
    update: {
      sortOrder: 0,
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
  modernVoicesBooks.forEach((membership) => {
    console.log(`     • ${membership.featuredBook.title} by ${membership.featuredBook.author}`);
  });

  console.log('\n🎉 José Hernández biography seeded successfully!');
  console.log('\n💡 Next steps:');
  console.log('   1. Wait for simplification to complete');
  console.log('   2. Generate preview: node scripts/generate-jose-hernandez-preview.js A1');
  console.log('   3. Generate bundles: node scripts/generate-jose-hernandez-bundles.js A1');
  console.log('   4. Create API endpoint: app/api/jose-hernandez-a1/bundles/route.ts');
  console.log('   5. Frontend integration: lib/config/books.ts');
}

main()
  .catch((error) => {
    console.error('❌ Error seeding José Hernández:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

