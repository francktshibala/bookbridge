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

function getWorkplaceDiscrimination1Metadata() {
  const genres: string[] = ['Modern Story', 'Workplace Discrimination', 'Overcoming Barriers'];
  const themes: string[] = ['Workplace Discrimination Overcome', 'Breaking Barriers', 'Proving Worth', 'Becoming Leader', 'Mentoring Others', 'Fighting for Rights', 'Pay Equity', 'Accommodations', 'Determination', 'Triumph'];
  const moods: string[] = ['Inspiring', 'Empowering', 'Resilient', 'Transformative', 'Hopeful', 'Uplifting'];
  return { genres, themes, moods };
}

async function seedWorkplaceDiscrimination1() {
  console.log('🎤 Seeding "Workplace Discrimination Overcome" to Modern Voices Collection...\n');

  const storyId = 'workplace-discrimination-1';
  const metadata = getWorkplaceDiscrimination1Metadata();

  // Based on A1 simplified text (299 sentences, 2,389 words)
  const sentences = 299;
  const bundles = 60; // ~5 sentences per bundle
  const readingTime = Math.ceil(2389 / 80); // A1 reading speed ~80 words/min -> ~30 minutes

  const workplaceDiscrimination1Story = {
    id: storyId,
    title: 'Workplace Discrimination Overcome',
    author: 'BookBridge',
    description: 'Jordan faces discrimination at work because of who she is. She is the only woman, the only person of color, the only one who needs accommodations. People doubt her. They exclude her. They make her feel small. But Jordan does not give up. She fights back. She proves her worth. She becomes a leader and mentor. This powerful story follows her journey of overcoming discrimination through determination, skill, and persistence. An inspiring tale about breaking barriers and achieving success despite discrimination. A1 level with Jane voice.',
    sentences: sentences,
    bundles: bundles,
    gradient: 'from-purple-500 to-pink-600',
    abbreviation: 'WD'
  };

  const book = await prisma.featuredBook.upsert({
    where: { slug: workplaceDiscrimination1Story.id },
    create: {
      slug: workplaceDiscrimination1Story.id,
      title: workplaceDiscrimination1Story.title,
      author: workplaceDiscrimination1Story.author,
      description: workplaceDiscrimination1Story.description,
      sentences: workplaceDiscrimination1Story.sentences,
      bundles: workplaceDiscrimination1Story.bundles,
      gradient: convertGradient(workplaceDiscrimination1Story.gradient),
      abbreviation: workplaceDiscrimination1Story.abbreviation,
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
      title: workplaceDiscrimination1Story.title,
      author: workplaceDiscrimination1Story.author,
      description: workplaceDiscrimination1Story.description,
      sentences: workplaceDiscrimination1Story.sentences,
      bundles: workplaceDiscrimination1Story.bundles,
      gradient: convertGradient(workplaceDiscrimination1Story.gradient),
      abbreviation: workplaceDiscrimination1Story.abbreviation,
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
      sortOrder: 28, // After lost-heritage-1 at 27
    },
    update: {
      sortOrder: 28,
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
  console.log(`   - Composite Story: 3 sources (Haben Girma, Dr. Cheryl Ingram, Myrna Pitaluna-Alngog)`);
}

seedWorkplaceDiscrimination1()
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

