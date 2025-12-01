#!/usr/bin/env npx tsx

/**
 * Seed script for "Always a Family" StoryCorps conversation
 * Adds to Modern Voices collection in catalog
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Helper to convert Tailwind gradient to CSS gradient
function convertGradient(tailwind: string): string {
  const colors: Record<string, Record<string, string>> = {
    pink: { '500': '#ec4899', '600': '#db2777' },
    rose: { '500': '#f43f5e', '600': '#e11d48' },
  };

  const match = tailwind.match(/from-(\w+)-(\d+)\s+to-(\w+)-(\d+)/);
  if (!match) return 'linear-gradient(135deg, #ec4899 0%, #e11d48 100%)';

  const [, color1, shade1, color2, shade2] = match;
  const hex1 = colors[color1]?.[shade1] || '#ec4899';
  const hex2 = colors[color2]?.[shade2] || '#e11d48';

  return `linear-gradient(135deg, ${hex1} 0%, ${hex2} 100%)`;
}

// Metadata from curation file
function getStoryCorpsMetadata() {
  // Genres from curation file: True Story, Love, Relationships
  const genres: string[] = ['True Story', 'Love', 'Relationships'];

  // Themes
  const themes: string[] = ['Love', 'Marriage', 'Devotion', 'Family', 'Enduring Love'];

  // Moods from curation file: Heartwarming, Tearjerker, Beautiful
  const moods: string[] = ['Heartwarming', 'Tearjerker', 'Beautiful'];

  return { genres, themes, moods };
}

async function main() {
  console.log('🎤 Seeding "Always a Family" to Modern Voices Collection...\n');

  // 1. Create the StoryCorps FeaturedBook
  console.log('📚 Creating "Always a Family" StoryCorps conversation...');

  const storyCorps = {
    id: 'always-a-family',
    title: 'Always a Family',
    author: 'Danny & Annie Perasa',
    description: 'Deeply moving StoryCorps conversation about 63 years of love. Danny reads daily love notes he leaves for Annie. A1 level with Sarah voice. Heartwarming, tearjerker story perfect for beginners.',
    sentences: 60,
    bundles: 15,
    gradient: 'from-pink-500 to-rose-600',
    abbreviation: 'AF'
  };

  const metadata = getStoryCorpsMetadata();
  const readingTime = Math.ceil((storyCorps.sentences * 15) / 200); // ~5 minutes

  const book = await prisma.featuredBook.upsert({
    where: { slug: storyCorps.id },
    create: {
      slug: storyCorps.id,
      title: storyCorps.title,
      author: storyCorps.author,
      description: storyCorps.description,
      sentences: storyCorps.sentences,
      bundles: storyCorps.bundles,
      gradient: convertGradient(storyCorps.gradient),
      abbreviation: storyCorps.abbreviation,
      genres: metadata.genres,
      themes: metadata.themes,
      moods: metadata.moods,
      readingTimeMinutes: readingTime,
      difficultyScore: 0.2, // A1 level - very easy
      popularityScore: 96, // High priority - top StoryCorps pick
      isClassic: false, // Modern content
      isFeatured: true,
      isNew: true, // Mark as new
    },
    update: {
      title: storyCorps.title,
      author: storyCorps.author,
      description: storyCorps.description,
      sentences: storyCorps.sentences,
      bundles: storyCorps.bundles,
      gradient: convertGradient(storyCorps.gradient),
      abbreviation: storyCorps.abbreviation,
      genres: metadata.genres,
      themes: metadata.themes,
      moods: metadata.moods,
      readingTimeMinutes: readingTime,
      difficultyScore: 0.2,
      popularityScore: 96,
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

  // 3. Link StoryCorps to Modern Voices collection
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
      sortOrder: 3, // Fourth book in collection (after Power of Vulnerability, Danger of Single Story, How Great Leaders)
    },
    update: {
      sortOrder: 3,
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

  console.log('\n🎉 "Always a Family" seeded successfully!');
  console.log('\n💡 Next steps:');
  console.log('   1. Refresh your browser at http://localhost:3000/library');
  console.log('   2. Search for "modern voices" or "always a family"');
  console.log('   3. Click on "Modern Voices" collection filter');
  console.log('   4. Verify all content appears in the collection');
  console.log('   5. Test reading "Always a Family"');
}

main()
  .catch((error) => {
    console.error('❌ Error seeding Always a Family:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

