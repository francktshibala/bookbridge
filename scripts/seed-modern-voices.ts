#!/usr/bin/env npx tsx

/**
 * Seed script for Modern Voices Collection
 * Adds "The Power of Vulnerability" TED Talk and creates Modern Voices collection
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Helper to convert Tailwind gradient to CSS gradient
function convertGradient(tailwind: string): string {
  const colors: Record<string, Record<string, string>> = {
    purple: { '500': '#a855f7', '600': '#9333ea' },
    pink: { '500': '#ec4899', '600': '#db2777', '700': '#be123c' },
    rose: { '500': '#f43f5e', '600': '#e11d48' },
  };

  const match = tailwind.match(/from-(\w+)-(\d+)\s+to-(\w+)-(\d+)/);
  if (!match) return 'linear-gradient(135deg, #ec4899 0%, #e11d48 100%)';

  const [, color1, shade1, color2, shade2] = match;
  const hex1 = colors[color1]?.[shade1] || '#ec4899';
  const hex2 = colors[color2]?.[shade2] || '#e11d48';

  return `linear-gradient(135deg, ${hex1} 0%, ${hex2} 100%)`;
}

// Infer metadata from TED Talk description
function inferTEDMetadata(title: string, description: string) {
  const desc = description.toLowerCase();

  // Genres for TED Talk
  const genres: string[] = ['Inspirational Talk', 'Psychology', 'Personal Development'];

  // Themes
  const themes: string[] = [];
  if (desc.includes('vulnerability')) themes.push('Vulnerability');
  if (desc.includes('connection') || desc.includes('human connection')) themes.push('Human Connection');
  if (desc.includes('shame')) themes.push('Shame');
  if (desc.includes('worthiness') || desc.includes('self-worth')) themes.push('Self-Worth');
  if (desc.includes('courage') || desc.includes('authentic')) themes.push('Courage', 'Authenticity');

  // Moods
  const moods: string[] = ['inspiring', 'eye-opening', 'vulnerable', 'heartwarming'];

  return { genres, themes, moods };
}

async function main() {
  console.log('🎤 Seeding Modern Voices Collection...\n');

  // 1. Create the TED Talk FeaturedBook
  console.log('📚 Creating "The Power of Vulnerability" TED Talk...');

  const tedTalk = {
    id: 'power-of-vulnerability',
    title: 'The Power of Vulnerability',
    author: 'Brené Brown',
    description: 'Life-changing TED Talk about human connection, shame, and worthiness. A1 level with Jane voice narration. 388 sentences across 97 bundles exploring courage, authenticity, and vulnerability.',
    sentences: 388,
    bundles: 97,
    gradient: 'from-pink-500 to-rose-600',
    abbreviation: 'PV'
  };

  const metadata = inferTEDMetadata(tedTalk.title, tedTalk.description);
  const readingTime = Math.ceil((tedTalk.sentences * 15) / 200); // ~29 minutes

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
      popularityScore: 95, // High priority - top of catalog
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

  // 2. Create Modern Voices collection
  console.log('\n📦 Creating Modern Voices collection...');

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
      sortOrder: 0, // First book in collection
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
  });

  console.log(`  📚 Books in Modern Voices: ${modernVoicesBooks.length}`);
  modernVoicesBooks.forEach((membership) => {
    console.log(`     • ${membership.featuredBook.title} by ${membership.featuredBook.author}`);
  });

  console.log('\n🎉 Modern Voices collection seeded successfully!');
  console.log('\n💡 Next steps:');
  console.log('   1. Refresh your browser at http://localhost:3003/library');
  console.log('   2. Search for "modern voices" or "vulnerability"');
  console.log('   3. Click on "Modern Voices" collection filter');
  console.log('   4. Test reading the TED Talk');
}

main()
  .catch((error) => {
    console.error('❌ Error seeding Modern Voices:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
