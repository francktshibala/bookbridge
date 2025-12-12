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

function getLostHeritage1Metadata() {
  const genres: string[] = ['Modern Story', 'Lost Heritage', 'Identity Journey'];
  const themes: string[] = ['Reconnecting with Lost Heritage', 'Finding Identity', 'Learning Ancestral Language', 'Visiting Birth Country', 'Belonging', 'Cultural Reclamation', 'Identity Discovery', 'Hope', 'Transformation', 'Self-Acceptance'];
  const moods: string[] = ['Inspiring', 'Emotional', 'Hopeful', 'Transformative', 'Reflective', 'Uplifting'];
  return { genres, themes, moods };
}

async function seedLostHeritage1() {
  console.log('🎤 Seeding "Lost Heritage Reclaimed" to Modern Voices Collection...\n');

  const storyId = 'lost-heritage-1';
  const metadata = getLostHeritage1Metadata();

  // Based on A1 simplified text (231 sentences, 1,978 words)
  const sentences = 231;
  const bundles = 47; // ~5 sentences per bundle
  const readingTime = Math.ceil(1978 / 80); // A1 reading speed ~80 words/min -> ~25 minutes

  const lostHeritage1Story = {
    id: storyId,
    title: 'Lost Heritage Reclaimed',
    author: 'BookBridge',
    description: 'Yuna was four months old when she left Korea. She grew up in America, the only Asian person in her small town. She forgot the language, the food, the customs. For twenty-two years, she tried to be someone else. But then she decided to go back. She learned Korean. She visited Korea. She saw herself reflected everywhere. This powerful story follows her journey of reconnecting with lost heritage, finding identity, and reclaiming her roots. An inspiring tale about belonging, identity, and the courage to reconnect with what was lost. A1 level with Jane voice.',
    sentences: sentences,
    bundles: bundles,
    gradient: 'from-amber-500 to-orange-600',
    abbreviation: 'LH'
  };

  const book = await prisma.featuredBook.upsert({
    where: { slug: lostHeritage1Story.id },
    create: {
      slug: lostHeritage1Story.id,
      title: lostHeritage1Story.title,
      author: lostHeritage1Story.author,
      description: lostHeritage1Story.description,
      sentences: lostHeritage1Story.sentences,
      bundles: lostHeritage1Story.bundles,
      gradient: convertGradient(lostHeritage1Story.gradient),
      abbreviation: lostHeritage1Story.abbreviation,
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
      title: lostHeritage1Story.title,
      author: lostHeritage1Story.author,
      description: lostHeritage1Story.description,
      sentences: lostHeritage1Story.sentences,
      bundles: lostHeritage1Story.bundles,
      gradient: convertGradient(lostHeritage1Story.gradient),
      abbreviation: lostHeritage1Story.abbreviation,
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
      sortOrder: 27, // After refugee-journey-3 at 26
    },
    update: {
      sortOrder: 27,
    },
  });
  console.log(`✅ Added "${book.title}" to "${modernVoicesCollection.name}" collection`);
  console.log(`\n🎉 Seeding complete!\n`);
  console.log(`📊 Story Stats:`);
  console.log(`   - Sentences: ${sentences}`);
  console.log(`   - Bundles: ${bundles}`);
  console.log(`   - Reading Time: ~${readingTime} minutes`);
  console.log(`   - Level: A1`);
  console.log(`   - Voice: Jane`);
  console.log(`   - Composite Story: 3 sources (Jessica Boling, Quartz Adoptee, K'iche' Language)`);
}

seedLostHeritage1()
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

