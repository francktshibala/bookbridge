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

function getCulturalBridge2Metadata() {
  const genres: string[] = ['Modern Story', 'Inspirational', 'Career & Identity'];
  const themes: string[] = ['Career Choice', 'Generational Conflict', 'Immigrant Parents', 'Following Your Dreams', 'Honoring Sacrifices', 'Family Expectations', 'Personal Fulfillment', 'Tradition vs Modern Life'];
  const moods: string[] = ['Inspiring', 'Emotional', 'Uplifting', 'Reflective', 'Hopeful', 'Authentic'];
  return { genres, themes, moods };
}

async function seedCulturalBridge2() {
  console.log('🎤 Seeding "Bridging Traditions and Modern Life" to Modern Voices Collection...\n');

  const storyId = 'cultural-bridge-2';
  const metadata = getCulturalBridge2Metadata();

  // 160 sentences for A1 level, average 6 words/sentence, 85 WPM
  const sentences = 160;
  const bundles = 27; // ~6 sentences per bundle
  const readingTime = Math.ceil((sentences * 6) / 85); // ~11 minutes

  const culturalBridge2Story = {
    id: storyId,
    title: 'Bridging Traditions and Modern Life',
    author: 'BookBridge',
    description: 'An inspiring composite story about Jin, who faces pressure from her immigrant parents to choose safe careers like doctor or lawyer. But Jin dreams of a creative career with purpose. Through struggle, guilt, and courage, Jin learns that choosing her own dreams is the ultimate expression of gratitude. A powerful tale about honoring parents\' sacrifices while following your own heart, bridging traditions and modern life. A1 level with Daniel voice.',
    sentences: sentences,
    bundles: bundles,
    gradient: 'from-purple-500 to-indigo-600',
    abbreviation: 'CB2'
  };

  const book = await prisma.featuredBook.upsert({
    where: { slug: culturalBridge2Story.id },
    create: {
      slug: culturalBridge2Story.id,
      title: culturalBridge2Story.title,
      author: culturalBridge2Story.author,
      description: culturalBridge2Story.description,
      sentences: culturalBridge2Story.sentences,
      bundles: culturalBridge2Story.bundles,
      gradient: convertGradient(culturalBridge2Story.gradient),
      abbreviation: culturalBridge2Story.abbreviation,
      genres: metadata.genres,
      themes: metadata.themes,
      moods: metadata.moods,
      readingTimeMinutes: readingTime,
      difficultyScore: 0.2, // A1 level - very easy
      popularityScore: 85,
      isClassic: false, // Modern Voices collection
      isFeatured: true,
      isNew: true,
    },
    update: {
      title: culturalBridge2Story.title,
      author: culturalBridge2Story.author,
      description: culturalBridge2Story.description,
      sentences: culturalBridge2Story.sentences,
      bundles: culturalBridge2Story.bundles,
      gradient: convertGradient(culturalBridge2Story.gradient),
      abbreviation: culturalBridge2Story.abbreviation,
      genres: metadata.genres,
      themes: metadata.themes,
      moods: metadata.moods,
      readingTimeMinutes: readingTime,
      difficultyScore: 0.2,
      popularityScore: 85,
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
      sortOrder: 15, // 16th story in Modern Voices collection
    },
    update: {
      sortOrder: 15,
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
  console.log(`   - Composite Story: 3 sources (Greek-American, various Asian-American, Salvadoran-American)`);
}

seedCulturalBridge2()
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

