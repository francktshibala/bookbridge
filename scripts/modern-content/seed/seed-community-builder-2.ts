import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';

config({ path: '.env.local' });

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

function getCommunityBuilder2Metadata() {
  const genres: string[] = ['Modern Story', 'Inspirational', 'Community Builder'];
  const themes: string[] = ['Community Building', 'Belonging', 'Transformation', 'Empowerment', 'Educational Justice', 'Refugee Support', 'Mutual Healing', 'Soccer as Universal Language'];
  const moods: string[] = ['Inspiring', 'Hopeful', 'Empowering', 'Uplifting', 'Resilient', 'Emotional'];
  return { genres, themes, moods };
}

async function seedCommunityBuilder2() {
  console.log('🎤 Seeding "Community Builder: From Wrong Turn to School Network" to Modern Voices Collection...\n');

  const storyId = 'community-builder-2';
  const metadata = getCommunityBuilder2Metadata();

  // 207 sentences for A1 level, average 8.7 words/sentence, 80 WPM
  const sentences = 207;
  const bundles = 52; // 4 sentences per bundle
  const readingTime = Math.ceil((sentences * 8.7) / 80); // ~22 minutes

  const communityBuilder2Story = {
    id: storyId,
    title: 'Community Builder: From Wrong Turn to School Network',
    author: 'BookBridge', // Original narrative based on extracted themes
    description: 'An inspiring story about Layla, who lost everything when her family disowned her. She drifted from city to city, feeling alone. Then one wrong turn changed everything. She saw refugee children playing soccer with a deflated ball. This powerful tale shows how one person can build a community and transform lives. A1 level with Daniel voice.',
    sentences: sentences,
    bundles: bundles,
    gradient: 'from-green-500 to-teal-600',
    abbreviation: 'CB2'
  };

  const book = await prisma.featuredBook.upsert({
    where: { slug: communityBuilder2Story.id },
    create: {
      slug: communityBuilder2Story.id,
      title: communityBuilder2Story.title,
      author: communityBuilder2Story.author,
      description: communityBuilder2Story.description,
      sentences: communityBuilder2Story.sentences,
      bundles: communityBuilder2Story.bundles,
      gradient: convertGradient(communityBuilder2Story.gradient),
      abbreviation: communityBuilder2Story.abbreviation,
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
      title: communityBuilder2Story.title,
      author: communityBuilder2Story.author,
      description: communityBuilder2Story.description,
      sentences: communityBuilder2Story.sentences,
      bundles: communityBuilder2Story.bundles,
      gradient: convertGradient(communityBuilder2Story.gradient),
      abbreviation: communityBuilder2Story.abbreviation,
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

  console.log('\n🎉 "Community Builder: From Wrong Turn to School Network" seeded successfully!');
  console.log('\n💡 Next steps:');
  console.log('   1. Refresh your browser at http://localhost:3000/library');
  console.log('   2. Search for "modern voices" or "community builder"');
  console.log('   3. Click on "Modern Voices" collection filter');
  console.log('   4. Verify all content appears in the collection');
  console.log('   5. Test reading "Community Builder: From Wrong Turn to School Network"');
}

seedCommunityBuilder2()
  .catch(error => {
    console.error(`\n💥 Fatal error:`, error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

