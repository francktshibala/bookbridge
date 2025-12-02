#!/usr/bin/env npx tsx

/**
 * Seed script for Anne Lindbergh Biography
 * Adds Anne Lindbergh to Modern Voices collection
 */

import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

// Helper to convert Tailwind gradient to CSS gradient
function convertGradient(tailwind: string): string {
  const colors: Record<string, Record<string, string>> = {
    purple: { '500': '#a855f7', '600': '#9333ea' },
    pink: { '500': '#ec4899', '600': '#db2777', '700': '#be123c' },
    rose: { '500': '#f43f5e', '600': '#e11d48' },
    blue: { '500': '#3b82f6', '600': '#2563eb' },
    indigo: { '500': '#6366f1', '600': '#4f46e5' },
    sky: { '500': '#0ea5e9', '600': '#0284c7' },
  };

  const match = tailwind.match(/from-(\w+)-(\d+)\s+to-(\w+)-(\d+)/);
  if (!match) return 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)';

  const [, color1, shade1, color2, shade2] = match;
  const hex1 = colors[color1]?.[shade1] || '#3b82f6';
  const hex2 = colors[color2]?.[shade2] || '#2563eb';

  return `linear-gradient(135deg, ${hex1} 0%, ${hex2} 100%)`;
}

// Infer metadata from biography description
function inferBiographyMetadata(title: string, description: string) {
  const desc = description.toLowerCase();

  // Genres: Biography, Women's History, Adventure
  const genres: string[] = ['Biography', "Women's History", 'Adventure'];

  // Themes
  const themes: string[] = [];
  if (desc.includes('pilot') || desc.includes('flying')) themes.push('Aviation', 'Exploration');
  if (desc.includes('writer') || desc.includes('writing')) themes.push('Writing', 'Literature');
  if (desc.includes('gift from the sea')) themes.push('Self-Reflection', 'Simplicity');
  if (desc.includes('women') || desc.includes('female')) themes.push('Women\'s Rights', 'Feminism');

  // Moods: Inspiring, Thoughtful, Reflective
  const moods: string[] = ['Inspiring', 'Thoughtful', 'Reflective'];

  return { genres, themes, moods };
}

async function main() {
  console.log('✈️  Seeding Anne Lindbergh Biography...\n');

  // Read simplified text to get sentence count
  const a1TextPath = path.join(process.cwd(), 'cache/anne-lindbergh-a1-simplified.txt');
  let sentenceCount = 61; // Default from simplification output
  let wordCount = 497;

  if (fs.existsSync(a1TextPath)) {
    const a1Text = fs.readFileSync(a1TextPath, 'utf8');
    sentenceCount = a1Text.split(/[.!?]+\s+/).filter(s => s.trim().length > 20).length;
    wordCount = a1Text.split(/\s+/).length;
  }

  // Calculate bundles (4 sentences per bundle)
  const bundleCount = Math.ceil(sentenceCount / 4);

  // 1. Create the FeaturedBook
  console.log('📚 Creating "Anne Lindbergh" Biography...');

  const biography = {
    id: 'anne-lindbergh',
    title: 'Anne Lindbergh: Aviator and Author',
    author: 'Anne Morrow Lindbergh',
    description: 'Inspiring biography of Anne Morrow Lindbergh, pioneering aviator and writer. From flying around the world with Charles Lindbergh to writing "Gift from the Sea," discover the life of a remarkable woman who balanced adventure, family, and self-discovery. A1 level with Daniel voice narration.',
    sentences: sentenceCount,
    bundles: bundleCount,
    gradient: 'from-sky-500 to-blue-600',
    abbreviation: 'AL'
  };

  const metadata = inferBiographyMetadata(biography.title, biography.description);
  const readingTime = Math.ceil((sentenceCount * 15) / 200); // ~12 minutes

  const book = await prisma.featuredBook.upsert({
    where: { slug: biography.id },
    create: {
      slug: biography.id,
      title: biography.title,
      author: biography.author,
      description: biography.description,
      sentences: sentenceCount,
      bundles: bundleCount,
      gradient: convertGradient(biography.gradient),
      abbreviation: biography.abbreviation,
      genres: metadata.genres,
      themes: metadata.themes,
      moods: metadata.moods,
      readingTimeMinutes: readingTime,
      difficultyScore: 0.3, // A1 level - easier
      popularityScore: 90, // High priority
      isClassic: false, // Modern content
      isFeatured: true,
      isNew: true, // Mark as new
    },
    update: {
      title: biography.title,
      author: biography.author,
      description: biography.description,
      sentences: sentenceCount,
      bundles: bundleCount,
      gradient: convertGradient(biography.gradient),
      abbreviation: biography.abbreviation,
      genres: metadata.genres,
      themes: metadata.themes,
      moods: metadata.moods,
      readingTimeMinutes: readingTime,
      difficultyScore: 0.3,
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

  // 2. Ensure Modern Voices collection exists
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

  // 3. Link book to Modern Voices collection
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
    },
    update: {},
  });

  console.log(`  ✅ Linked "${book.title}" to "${collection.name}"`);

  console.log('\n✅ Seeding complete!');
  console.log(`\n🎯 Next steps:`);
  console.log(`   1. Generate preview: node scripts/generate-anne-lindbergh-preview.js A1`);
  console.log(`   2. Generate bundles: node scripts/generate-anne-lindbergh-bundles.js A1 --pilot`);
  console.log(`   3. Integrate database: npx tsx scripts/integrate-anne-lindbergh-a1-database.ts`);
  console.log(`   4. Create API endpoint: app/api/anne-lindbergh-a1/bundles/route.ts`);
  console.log(`   5. Add to frontend: lib/config/books.ts`);
  console.log('');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

