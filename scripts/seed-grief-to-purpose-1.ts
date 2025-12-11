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

function getGriefToPurpose1Metadata() {
  const genres: string[] = ['Modern Story', 'Inspirational', 'Transformation'];
  const themes: string[] = ['Grief to Purpose', 'Loss', 'Finding Meaning', 'Helping Others', 'Transformation', 'Legacy', 'Service', 'Healing'];
  const moods: string[] = ['Emotional', 'Inspiring', 'Hopeful', 'Uplifting', 'Moving', 'Transformative'];
  return { genres, themes, moods };
}

async function seedGriefToPurpose1() {
  console.log('🎤 Seeding "Grief to Purpose: Finding Meaning in Loss" to Modern Voices Collection...\n');

  const storyId = 'grief-to-purpose-1';
  const metadata = getGriefToPurpose1Metadata();

  // 190 sentences for A1 level, average 6 words/sentence, 80 WPM (A1 reading speed)
  const sentences = 190;
  const bundles = 31; // ~6 sentences per bundle
  const readingTime = Math.ceil((sentences * 6) / 80); // ~14 minutes

  const griefToPurpose1Story = {
    id: storyId,
    title: 'Grief to Purpose: Finding Meaning in Loss',
    author: 'BookBridge',
    description: 'A powerful composite story about Anna, who loses her eight-year-old son Ethan in a tragic accident. Devastated by grief, Anna discovers Ethan\'s list of ways to help others and decides to honor his memory by creating Ethan\'s Connection, a nonprofit providing technology to sick children. This moving story shows how we can transform our deepest pain into purpose, finding meaning in tragedy and helping others through our own loss. A1 level with Jane voice.',
    sentences: sentences,
    bundles: bundles,
    gradient: 'from-indigo-500 to-purple-600',
    abbreviation: 'GP1'
  };

  const book = await prisma.featuredBook.upsert({
    where: { slug: griefToPurpose1Story.id },
    create: {
      slug: griefToPurpose1Story.id,
      title: griefToPurpose1Story.title,
      author: griefToPurpose1Story.author,
      description: griefToPurpose1Story.description,
      sentences: griefToPurpose1Story.sentences,
      bundles: griefToPurpose1Story.bundles,
      gradient: convertGradient(griefToPurpose1Story.gradient),
      abbreviation: griefToPurpose1Story.abbreviation,
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
      title: griefToPurpose1Story.title,
      author: griefToPurpose1Story.author,
      description: griefToPurpose1Story.description,
      sentences: griefToPurpose1Story.sentences,
      bundles: griefToPurpose1Story.bundles,
      gradient: convertGradient(griefToPurpose1Story.gradient),
      abbreviation: griefToPurpose1Story.abbreviation,
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
      sortOrder: 22, // 18th story in Modern Voices collection (after romantic-love-1 at 21)
    },
    update: {
      sortOrder: 22,
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
  console.log(`   - Composite Story: 4 sources (Kate Braestrup, Scarlett Lewis, Leslie Morissette, Michelle Schwartzmier)`);
}

seedGriefToPurpose1()
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

