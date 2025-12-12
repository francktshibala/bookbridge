/**
 * Add "The Tell-Tale Heart" to Classic Literature Collection
 * This book exists in config but wasn't seeded yet
 */

import { PrismaClient } from '@prisma/client';

// Simple metadata inference (matching seed.ts pattern)
function inferMetadata(title: string, author: string, description: string) {
  const titleLower = title.toLowerCase();
  const descLower = description.toLowerCase();
  
  const genres: string[] = [];
  const themes: string[] = [];
  const moods: string[] = [];
  
  // Genre detection
  if (descLower.includes('gothic') || titleLower.includes('gothic')) genres.push('Gothic');
  if (descLower.includes('psychological') || descLower.includes('thriller')) genres.push('Psychological Fiction');
  if (descLower.includes('horror') || descLower.includes('scary')) genres.push('Horror');
  if (descLower.includes('romance') || descLower.includes('love')) genres.push('Romance');
  if (descLower.includes('classic')) genres.push('Classic Literature');
  if (genres.length === 0) genres.push('Classic Literature');
  
  // Theme detection
  if (descLower.includes('guilt') || descLower.includes('madness')) themes.push('Psychological');
  if (descLower.includes('love')) themes.push('Love');
  if (descLower.includes('sacrifice')) themes.push('Sacrifice');
  
  // Mood detection
  if (descLower.includes('thriller') || descLower.includes('gothic')) moods.push('Dark');
  if (descLower.includes('heartwarming')) moods.push('Heartwarming');
  if (descLower.includes('psychological')) moods.push('Intense');
  
  return { genres, themes, moods };
}

const prisma = new PrismaClient();

async function addTellTaleHeart() {
  console.log('📚 Adding "The Tell-Tale Heart" to Classic Literature...\n');

  const tellTaleHeart = {
    slug: 'tell-tale-heart',
    title: 'The Tell-Tale Heart',
    author: 'Edgar Allan Poe',
    description: 'Gothic psychological thriller about guilt and madness. A1 level with Daniel voice narration. Perfect for building reading confidence.',
    sentences: 277,
    bundles: 70,
    gradient: 'from-red-500 to-gray-900',
    abbreviation: 'TH'
  };

  // Calculate reading time
  const wordsPerSentence = 15;
  const wordsPerMinute = 200;
  const readingTime = Math.ceil((tellTaleHeart.sentences * wordsPerSentence) / wordsPerMinute);

  // Infer metadata
  const metadata = inferMetadata(tellTaleHeart.title, tellTaleHeart.author, tellTaleHeart.description);

  // Convert gradient
  const convertGradient = (gradient: string) => {
    return gradient.replace(/from-(\w+)-(\d+)\s+to-(\w+)-(\d+)/, 'linear-gradient(135deg, var(--$1-$2), var(--$3-$4))');
  };

  // Upsert book
  const book = await prisma.featuredBook.upsert({
    where: { slug: tellTaleHeart.slug },
    create: {
      slug: tellTaleHeart.slug,
      title: tellTaleHeart.title,
      author: tellTaleHeart.author,
      description: tellTaleHeart.description,
      sentences: tellTaleHeart.sentences,
      bundles: tellTaleHeart.bundles,
      gradient: convertGradient(tellTaleHeart.gradient),
      abbreviation: tellTaleHeart.abbreviation,
      genres: metadata.genres,
      themes: metadata.themes,
      moods: metadata.moods,
      readingTimeMinutes: readingTime,
      difficultyScore: 0.5,
      popularityScore: 95, // High priority classic
      isClassic: true,
      isFeatured: true,
      isNew: false
    },
    update: {
      title: tellTaleHeart.title,
      author: tellTaleHeart.author,
      description: tellTaleHeart.description,
      sentences: tellTaleHeart.sentences,
      bundles: tellTaleHeart.bundles,
      gradient: convertGradient(tellTaleHeart.gradient),
      abbreviation: tellTaleHeart.abbreviation,
      genres: metadata.genres,
      themes: metadata.themes,
      moods: metadata.moods,
      readingTimeMinutes: readingTime,
      difficultyScore: 0.5,
      popularityScore: 95,
      isClassic: true,
      isFeatured: true,
      isNew: false
    }
  });

  console.log(`✅ Created/Updated: ${book.title} by ${book.author}`);

  // Get Classic Literature collection
  const classicCollection = await prisma.bookCollection.findUnique({
    where: { slug: 'classics' }
  });

  if (!classicCollection) {
    throw new Error('Classic Literature collection not found');
  }

  // Get current max sortOrder
  const maxSortOrder = await prisma.bookCollectionMembership.findFirst({
    where: { collectionId: classicCollection.id },
    orderBy: { sortOrder: 'desc' }
  });

  const nextSortOrder = (maxSortOrder?.sortOrder ?? -1) + 1;

  // Add to collection
  await prisma.bookCollectionMembership.upsert({
    where: {
      bookId_collectionId: {
        bookId: book.id,
        collectionId: classicCollection.id
      }
    },
    create: {
      bookId: book.id,
      collectionId: classicCollection.id,
      sortOrder: nextSortOrder
    },
    update: {
      sortOrder: nextSortOrder
    }
  });

  console.log(`✅ Added to Classic Literature collection (sortOrder: ${nextSortOrder})`);

  // Verify count
  const count = await prisma.bookCollectionMembership.count({
    where: { collectionId: classicCollection.id }
  });

  console.log(`\n✅ Classic Literature now has ${count} books`);
}

if (require.main === module) {
  addTellTaleHeart()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
}

export { addTellTaleHeart };

