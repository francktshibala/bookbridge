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

function getRomanticLove1Metadata() {
  const genres: string[] = ['Modern Story', 'Romance', 'Inspirational'];
  const themes: string[] = ['Cross-Cultural Love', 'Family Resistance', 'Choosing Love Over Tradition', 'Finding Your Voice', 'Cultural Bridge', 'Love & Relationships', 'Identity', 'Acceptance'];
  const moods: string[] = ['Emotional', 'Inspiring', 'Romantic', 'Hopeful', 'Uplifting', 'Authentic'];
  return { genres, themes, moods };
}

async function seedRomanticLove1() {
  console.log('🎤 Seeding "Cross-Cultural Love Story" to Modern Voices Collection...\n');

  const storyId = 'romantic-love-1';
  const metadata = getRomanticLove1Metadata();

  // 171 sentences for A1 level, average 6 words/sentence, 80 WPM (A1 reading speed)
  const sentences = 171;
  const bundles = 29; // ~6 sentences per bundle
  const readingTime = Math.ceil((sentences * 6) / 80); // ~13 minutes

  const romanticLove1Story = {
    id: storyId,
    title: 'Cross-Cultural Love Story',
    author: 'BookBridge',
    description: 'An inspiring composite story about Maya, who falls in love with Alex from a different culture. Her family says no, forcing her to hide their relationship for five years. Through fear, stress, and choosing love over family approval, Maya learns that love is worth fighting for and that she can have both family and love. A powerful tale about choosing love over tradition, building bridges between cultures, and finding your voice when the world says no. A1 level with Jane voice.',
    sentences: sentences,
    bundles: bundles,
    gradient: 'from-pink-500 to-rose-600',
    abbreviation: 'RL1'
  };

  const book = await prisma.featuredBook.upsert({
    where: { slug: romanticLove1Story.id },
    create: {
      slug: romanticLove1Story.id,
      title: romanticLove1Story.title,
      author: romanticLove1Story.author,
      description: romanticLove1Story.description,
      sentences: romanticLove1Story.sentences,
      bundles: romanticLove1Story.bundles,
      gradient: convertGradient(romanticLove1Story.gradient),
      abbreviation: romanticLove1Story.abbreviation,
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
      title: romanticLove1Story.title,
      author: romanticLove1Story.author,
      description: romanticLove1Story.description,
      sentences: romanticLove1Story.sentences,
      bundles: romanticLove1Story.bundles,
      gradient: convertGradient(romanticLove1Story.gradient),
      abbreviation: romanticLove1Story.abbreviation,
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
      sortOrder: 16, // 17th story in Modern Voices collection
    },
    update: {
      sortOrder: 16,
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
  console.log(`   - Composite Story: 4 sources (Lebanese/African American, British Indian/Angolan, Indian Hindu-Muslim interfaith, White Southern/Indian)`);
}

seedRomanticLove1()
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

