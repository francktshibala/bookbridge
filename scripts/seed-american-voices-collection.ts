#!/usr/bin/env npx tsx

/**
 * Seed script: American Voices Collection (Sprint 3)
 *
 * Adds 3 public domain stories to a new "American Voices" collection:
 *   1. Frederick Douglass — "Learning to Read and Write" (A2)
 *   2. Mary Antin — "The Promised Land: Initiation" (A1)
 *   3. Booker T. Washington — "The Struggle for an Education" (A2)
 *
 * Sources: Project Gutenberg (all pre-1929, fully public domain)
 * Audio: None — text-only for now, architecture supports future audio addition
 *
 * Usage: npx tsx scripts/seed-american-voices-collection.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function convertGradient(tailwind: string): string {
  const colors: Record<string, Record<string, string>> = {
    amber:  { '600': '#d97706', '700': '#b45309' },
    orange: { '600': '#ea580c', '700': '#c2410c' },
    teal:   { '600': '#0d9488', '700': '#0f766e' },
    blue:   { '700': '#1d4ed8', '800': '#1e40af' },
    stone:  { '600': '#57534e', '700': '#44403c' },
    rose:   { '600': '#e11d48', '700': '#be123c' },
  };

  const match = tailwind.match(/from-(\w+)-(\d+)\s+to-(\w+)-(\d+)/);
  if (!match) return 'linear-gradient(135deg, #d97706 0%, #b45309 100%)';

  const [, color1, shade1, color2, shade2] = match;
  const hex1 = colors[color1]?.[shade1] || '#d97706';
  const hex2 = colors[color2]?.[shade2] || '#b45309';

  return `linear-gradient(135deg, ${hex1} 0%, ${hex2} 100%)`;
}

const BOOKS = [
  {
    slug: 'frederick-douglass-reading',
    title: 'Learning to Read and Write',
    author: 'Frederick Douglass',
    description: 'The true story of how Frederick Douglass secretly taught himself to read while enslaved — trading bread for lessons with poor white boys, copying letters from ships, practicing with chalk on walls. A powerful memoir about literacy as liberation. A2 level.',
    abbreviation: 'FD',
    gradient: 'from-amber-600 to-stone-700',
    sentences: 22,
    bundles: 6,
    genres: ['Memoir', 'Historical', 'Inspirational'],
    themes: ['Education', 'Freedom', 'Perseverance', 'Resistance', 'Literacy'],
    moods: ['Inspiring', 'Emotional', 'Determined', 'Hopeful'],
    readingTimeMinutes: 10,
    difficultyScore: 0.4,
    popularityScore: 92,
    publicationYear: 1845,
    era: '19th Century',
    literaryMovement: 'Abolitionist Literature',
    region: 'American Classics',
    country: 'United States',
  },
  {
    slug: 'mary-antin-promised-land',
    title: 'The Promised Land: Initiation',
    author: 'Mary Antin',
    description: 'Mary Antin arrived from Russia at age 13, knowing no English. This is the story of her first months in an American school — the teachers who believed in her, the words she conquered, and the day she saw her own name in print for the very first time. A1 level.',
    abbreviation: 'MA',
    gradient: 'from-teal-600 to-blue-700',
    sentences: 20,
    bundles: 5,
    genres: ['Memoir', 'Immigration', 'Inspirational'],
    themes: ['Immigration', 'Education', 'Language Learning', 'Identity', 'Belonging'],
    moods: ['Heartwarming', 'Hopeful', 'Triumphant', 'Emotional'],
    readingTimeMinutes: 8,
    difficultyScore: 0.2,
    popularityScore: 88,
    publicationYear: 1912,
    era: 'Early 20th Century',
    literaryMovement: 'Immigrant Memoir',
    region: 'American Classics',
    country: 'United States',
  },
  {
    slug: 'booker-washington-school',
    title: 'The Struggle for an Education',
    author: 'Booker T. Washington',
    description: 'Booker T. Washington heard two miners talking about a school in Virginia. He had no money, no map, and no plan — only the fire of ambition. This is the story of his 500-mile journey to Hampton Institute, and the broom test that changed his life. A2 level.',
    abbreviation: 'BW',
    gradient: 'from-orange-600 to-rose-700',
    sentences: 24,
    bundles: 6,
    genres: ['Memoir', 'Historical', 'Inspirational'],
    themes: ['Education', 'Perseverance', 'Determination', 'Poverty', 'Hope'],
    moods: ['Inspiring', 'Emotional', 'Triumphant', 'Determined'],
    readingTimeMinutes: 11,
    difficultyScore: 0.4,
    popularityScore: 90,
    publicationYear: 1901,
    era: 'Early 20th Century',
    literaryMovement: 'African American Memoir',
    region: 'American Classics',
    country: 'United States',
  },
];

async function main() {
  console.log('🗽 Seeding American Voices Collection (Sprint 3)...\n');

  // 1. Create or verify the "American Voices" collection
  console.log('📦 Creating American Voices collection...');

  const collection = await prisma.bookCollection.upsert({
    where: { slug: 'american-voices' },
    create: {
      slug: 'american-voices',
      name: 'American Voices',
      description: 'True stories from real people who fought for education, freedom, and belonging in America — Frederick Douglass, Mary Antin, Booker T. Washington, and more.',
      icon: '🗽',
      type: 'collection',
      isPrimary: true,
      sortOrder: 5,
      isSmartCollection: false,
    },
    update: {
      name: 'American Voices',
      description: 'True stories from real people who fought for education, freedom, and belonging in America — Frederick Douglass, Mary Antin, Booker T. Washington, and more.',
      icon: '🗽',
      isPrimary: true,
    },
  });

  console.log(`  ✅ Collection: ${collection.name} (${collection.icon})`);

  // 2. Create each book and link to collection
  for (let i = 0; i < BOOKS.length; i++) {
    const bookData = BOOKS[i];
    console.log(`\n📚 Seeding "${bookData.title}" by ${bookData.author}...`);

    const book = await prisma.featuredBook.upsert({
      where: { slug: bookData.slug },
      create: {
        slug: bookData.slug,
        title: bookData.title,
        author: bookData.author,
        description: bookData.description,
        sentences: bookData.sentences,
        bundles: bookData.bundles,
        gradient: convertGradient(bookData.gradient),
        abbreviation: bookData.abbreviation,
        genres: bookData.genres,
        themes: bookData.themes,
        moods: bookData.moods,
        readingTimeMinutes: bookData.readingTimeMinutes,
        difficultyScore: bookData.difficultyScore,
        popularityScore: bookData.popularityScore,
        publicationYear: bookData.publicationYear,
        era: bookData.era,
        literaryMovement: bookData.literaryMovement,
        region: bookData.region,
        country: bookData.country,
        isClassic: true,
        isFeatured: true,
        isNew: true,
      },
      update: {
        title: bookData.title,
        author: bookData.author,
        description: bookData.description,
        sentences: bookData.sentences,
        bundles: bookData.bundles,
        gradient: convertGradient(bookData.gradient),
        abbreviation: bookData.abbreviation,
        genres: bookData.genres,
        themes: bookData.themes,
        moods: bookData.moods,
        readingTimeMinutes: bookData.readingTimeMinutes,
        difficultyScore: bookData.difficultyScore,
        popularityScore: bookData.popularityScore,
        isNew: true,
        isFeatured: true,
      },
    });

    console.log(`  ✅ Book created: ${book.title} (id: ${book.id})`);

    // Link to collection
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
        sortOrder: i,
      },
      update: {
        sortOrder: i,
      },
    });

    console.log(`  🔗 Linked to "${collection.name}" (position ${i + 1})`);
  }

  // 3. Verify
  console.log('\n✅ Verification...');

  const finalBooks = await prisma.bookCollectionMembership.findMany({
    where: { collectionId: collection.id },
    include: { featuredBook: true },
    orderBy: { sortOrder: 'asc' },
  });

  console.log(`\n📚 Books in "${collection.name}": ${finalBooks.length}`);
  finalBooks.forEach((m, idx) => {
    console.log(`   ${idx + 1}. ${m.featuredBook.title} by ${m.featuredBook.author}`);
  });

  console.log('\n🎉 American Voices collection seeded successfully!');
  console.log('\n💡 Next steps:');
  console.log('   1. Add these book IDs to scripts/seed-quiz-questions.js');
  console.log('   2. Run: node scripts/seed-quiz-questions.js');
  console.log('   3. Upload story_bundles rows for each book (text-only, audio_url = null)');
  console.log('   4. Verify stories appear on bookbridge.app');
}

main()
  .catch((err) => {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
