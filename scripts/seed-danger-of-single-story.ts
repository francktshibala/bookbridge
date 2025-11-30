#!/usr/bin/env npx tsx

/**
 * Seed script for "The Danger of a Single Story" TED Talk
 * Adds to Modern Voices collection in catalog
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Helper to convert Tailwind gradient to CSS gradient
function convertGradient(tailwind: string): string {
  const colors: Record<string, Record<string, string>> = {
    orange: { '500': '#f97316', '600': '#ea580c' },
    purple: { '500': '#a855f7', '600': '#9333ea' },
  };

  const match = tailwind.match(/from-(\w+)-(\d+)\s+to-(\w+)-(\d+)/);
  if (!match) return 'linear-gradient(135deg, #f97316 0%, #9333ea 100%)';

  const [, color1, shade1, color2, shade2] = match;
  const hex1 = colors[color1]?.[shade1] || '#f97316';
  const hex2 = colors[color2]?.[shade2] || '#9333ea';

  return `linear-gradient(135deg, ${hex1} 0%, ${hex2} 100%)`;
}

// Infer metadata from TED Talk description
function inferTEDMetadata(title: string, description: string) {
  const desc = description.toLowerCase();

  // Genres for TED Talk
  const genres: string[] = ['Inspirational Talk', 'Cultural Studies', 'Social Issues'];

  // Themes
  const themes: string[] = [];
  if (desc.includes('stereotypes')) themes.push('Stereotypes');
  if (desc.includes('identity')) themes.push('Identity');
  if (desc.includes('culture')) themes.push('Culture', 'Cultural Understanding');
  if (desc.includes('representation') || desc.includes('diverse')) themes.push('Representation', 'Diversity');
  if (desc.includes('dignity')) themes.push('Human Dignity');

  // Moods
  const moods: string[] = ['eye-opening', 'thought-provoking', 'empowering', 'enlightening'];

  return { genres, themes, moods };
}

async function main() {
  console.log('🎤 Seeding "The Danger of a Single Story" to Modern Voices Collection...\n');

  // 1. Create the TED Talk FeaturedBook
  console.log('📚 Creating "The Danger of a Single Story" TED Talk...');

  const tedTalk = {
    id: 'danger-of-single-story',
    title: 'The Danger of a Single Story',
    author: 'Chimamanda Ngozi Adichie',
    description: 'Powerful TED Talk about stereotypes, identity, and the importance of diverse narratives. A1 level with Sarah voice narration. 122 sentences across 31 bundles exploring culture, representation, and human dignity.',
    sentences: 122,
    bundles: 31,
    gradient: 'from-orange-500 to-purple-600',
    abbreviation: 'DS'
  };

  const metadata = inferTEDMetadata(tedTalk.title, tedTalk.description);
  const readingTime = Math.ceil((tedTalk.sentences * 15) / 200); // ~9 minutes

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
      popularityScore: 94, // High priority - just below Power of Vulnerability
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
      popularityScore: 94,
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
      sortOrder: 1, // Second book in collection (after Power of Vulnerability)
    },
    update: {
      sortOrder: 1,
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

  console.log('\n🎉 "The Danger of a Single Story" seeded successfully!');
  console.log('\n💡 Next steps:');
  console.log('   1. Refresh your browser at http://localhost:3000/library');
  console.log('   2. Search for "modern voices" or "danger of single story"');
  console.log('   3. Click on "Modern Voices" collection filter');
  console.log('   4. Verify both TED Talks appear in the collection');
  console.log('   5. Test reading "The Danger of a Single Story"');
}

main()
  .catch((error) => {
    console.error('❌ Error seeding The Danger of a Single Story:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
