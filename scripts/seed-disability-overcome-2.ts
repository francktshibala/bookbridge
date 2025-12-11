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

function getDisabilityOvercome2Metadata() {
  const genres: string[] = ['Modern Story', 'Inspirational', 'Disability Overcome'];
  const themes: string[] = ['Overcoming Challenges', 'Blindness', 'Mountaineering', 'Determination', 'Courage', 'Adaptation', 'Achievement', 'No Barriers'];
  const moods: string[] = ['Inspiring', 'Empowering', 'Uplifting', 'Resilient', 'Courageous', 'Triumphant'];
  return { genres, themes, moods };
}

async function seedDisabilityOvercome2() {
  console.log('🎤 Seeding "Blind Mountaineer: Reaching the Top" to Modern Voices Collection...\n');

  const storyId = 'disability-overcome-2';
  const metadata = getDisabilityOvercome2Metadata();

  // 158 sentences for A1 level, average 6.9 words/sentence, 80 WPM
  const sentences = 158;
  const bundles = 40; // ~4 sentences per bundle
  const readingTime = Math.ceil((sentences * 6.9) / 80); // ~14 minutes

  const disabilityOvercome2Story = {
    id: storyId,
    title: 'Blind Mountaineer: Reaching the Top',
    author: 'BookBridge', // Original narrative based on Erik Weihenmayer's story
    description: 'An inspiring story about Lucas (Erik Weihenmayer), who loses his sight at age 14 and faces a world that says he cannot do many things anymore. Through determination, courage, and finding new ways to navigate, he achieves his dream of climbing Mount Everest. This powerful tale shows how people overcome fear, adapt, and find new paths. A1 level with Daniel voice.',
    sentences: sentences,
    bundles: bundles,
    gradient: 'from-indigo-500 to-purple-600',
    abbreviation: 'DO2'
  };

  const book = await prisma.featuredBook.upsert({
    where: { slug: disabilityOvercome2Story.id },
    create: {
      slug: disabilityOvercome2Story.id,
      title: disabilityOvercome2Story.title,
      author: disabilityOvercome2Story.author,
      description: disabilityOvercome2Story.description,
      sentences: disabilityOvercome2Story.sentences,
      bundles: disabilityOvercome2Story.bundles,
      gradient: convertGradient(disabilityOvercome2Story.gradient),
      abbreviation: disabilityOvercome2Story.abbreviation,
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
      title: disabilityOvercome2Story.title,
      author: disabilityOvercome2Story.author,
      description: disabilityOvercome2Story.description,
      sentences: disabilityOvercome2Story.sentences,
      bundles: disabilityOvercome2Story.bundles,
      gradient: convertGradient(disabilityOvercome2Story.gradient),
      abbreviation: disabilityOvercome2Story.abbreviation,
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

  console.log('\n🎉 "Blind Mountaineer: Reaching the Top" seeded successfully!');
  console.log('\n💡 Next steps:');
  console.log('   1. Refresh your browser at http://localhost:3000/library');
  console.log('   2. Search for "modern voices" or "blind mountaineer"');
  console.log('   3. Click on "Modern Voices" collection filter');
  console.log('   4. Verify all content appears in the collection');
  console.log('   5. Test reading "Blind Mountaineer: Reaching the Top"');
}

seedDisabilityOvercome2()
  .catch(error => {
    console.error(`\n💥 Fatal error:`, error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

