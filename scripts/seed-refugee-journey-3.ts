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
    emerald: { '500': '#10b981', '600': '#059669' },
  };

  const match = tailwind.match(/from-(\w+)-(\d+)\s+to-(\w+)-(\d+)/);
  if (!match) return 'linear-gradient(135deg, #6366f1 0%, #2563eb 100%)';

  const [, color1, shade1, color2, shade2] = match;
  const hex1 = colors[color1]?.[shade1] || '#6366f1';
  const hex2 = colors[color2]?.[shade2] || '#2563eb';

  return `linear-gradient(135deg, ${hex1} 0%, ${hex2} 100%)`;
}

function getRefugeeJourney3Metadata() {
  const genres: string[] = ['Modern Story', 'Refugee Journey', 'Family Story'];
  const themes: string[] = ['Family Escape Together', 'Family Rebuilding Together', 'Dangerous Journey', 'Kindness from Strangers', 'Language Barriers', 'Education Priority', 'Identity Preservation', 'Gratitude', 'Hope', 'Persistence'];
  const moods: string[] = ['Inspiring', 'Hopeful', 'Emotional', 'Uplifting', 'Resilient', 'Transformative'];
  return { genres, themes, moods };
}

async function seedRefugeeJourney3() {
  console.log('🎤 Seeding "Refugee Family Journey" to Modern Voices Collection...\n');

  const storyId = 'refugee-journey-3';
  const metadata = getRefugeeJourney3Metadata();

  // Based on A1 simplified text (312 sentences, 2,585 words)
  const sentences = 312;
  const bundles = 63; // ~5 sentences per bundle
  const readingTime = Math.ceil(2585 / 80); // A1 reading speed ~80 words/min -> ~33 minutes

  const refugeeJourney3Story = {
    id: storyId,
    title: 'Refugee Family Journey',
    author: 'BookBridge',
    description: 'In 2000, Fatima receives an execution order for speaking out for women\'s rights. With her husband Ahmed and three sons—Hassan, Omar, and Yusuf—they must flee immediately. Hassan has a rare heart condition, and only doctors in the UK can save his life. This powerful story follows their 18-month journey through 8 countries, facing danger, hunger, and fear—but staying together as a family. Through kindness from strangers and unwavering determination, they reach safety and rebuild their lives together. An inspiring tale about family strength, hope, and the power of staying together. A1 level with Daniel voice.',
    sentences: sentences,
    bundles: bundles,
    gradient: 'from-blue-500 to-indigo-600',
    abbreviation: 'RJ3'
  };

  const book = await prisma.featuredBook.upsert({
    where: { slug: refugeeJourney3Story.id },
    create: {
      slug: refugeeJourney3Story.id,
      title: refugeeJourney3Story.title,
      author: refugeeJourney3Story.author,
      description: refugeeJourney3Story.description,
      sentences: refugeeJourney3Story.sentences,
      bundles: refugeeJourney3Story.bundles,
      gradient: convertGradient(refugeeJourney3Story.gradient),
      abbreviation: refugeeJourney3Story.abbreviation,
      genres: metadata.genres,
      themes: metadata.themes,
      moods: metadata.moods,
      readingTimeMinutes: readingTime,
      difficultyScore: 0.2, // A1 level - very easy
      popularityScore: 88,
      isClassic: false, // Modern Voices collection
      isFeatured: true,
      isNew: true,
    },
    update: {
      title: refugeeJourney3Story.title,
      author: refugeeJourney3Story.author,
      description: refugeeJourney3Story.description,
      sentences: refugeeJourney3Story.sentences,
      bundles: refugeeJourney3Story.bundles,
      gradient: convertGradient(refugeeJourney3Story.gradient),
      abbreviation: refugeeJourney3Story.abbreviation,
      genres: metadata.genres,
      themes: metadata.themes,
      moods: metadata.moods,
      readingTimeMinutes: readingTime,
      difficultyScore: 0.2,
      popularityScore: 88,
      isClassic: false,
      isFeatured: true,
      isNew: true,
    }
  });

  console.log(`✅ Created/Updated FeaturedBook: ${book.title} (id: ${book.id}, slug: ${book.slug})`);

  // Get or create Modern Voices collection
  const modernVoicesCollection = await prisma.bookCollection.upsert({
    where: { slug: 'modern-voices' },
    create: {
      slug: 'modern-voices',
      name: 'Modern Voices',
      description: 'Powerful modern stories of resilience, courage, and transformation. Each story follows real people who overcame incredible challenges and found new ways forward.',
      type: 'theme',
      sortOrder: 0,
      isPrimary: true,
    },
    update: {
      name: 'Modern Voices',
      description: 'Powerful modern stories of resilience, courage, and transformation. Each story follows real people who overcame incredible challenges and found new ways forward.',
      type: 'theme',
      isPrimary: true,
    },
  });

  console.log(`✅ Created/Updated Collection: ${modernVoicesCollection.name} (id: ${modernVoicesCollection.id})`);

  // Create membership
  const membership = await prisma.bookCollectionMembership.upsert({
    where: {
      bookId_collectionId: {
        bookId: book.id,
        collectionId: modernVoicesCollection.id,
      },
    },
    create: {
      bookId: book.id,
      collectionId: modernVoicesCollection.id,
      sortOrder: 26, // After refugee-journey-2 at 25
    },
    update: {
      sortOrder: 26,
    },
  });
  console.log(`✅ Added "${book.title}" to "${modernVoicesCollection.name}" collection`);
  console.log(`\n🎉 Seeding complete!\n`);
  console.log(`📊 Story Stats:`);
  console.log(`   - Sentences: ${sentences}`);
  console.log(`   - Bundles: ${bundles}`);
  console.log(`   - Reading Time: ~${readingTime} minutes`);
  console.log(`   - Level: A1`);
  console.log(`   - Voice: Daniel`);
  console.log(`   - Composite Story: 3 sources (Hamed Amiri Family, Yulia Rybinska Family, Olexandra Lukashov Family)`);
}

seedRefugeeJourney3()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });

