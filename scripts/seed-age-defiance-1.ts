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

function getAgeDefiance1Metadata() {
  const genres: string[] = ['Modern Story', 'Inspirational', 'Transformation'];
  const themes: string[] = ['Age Defiance', 'Starting Over', 'Never Give Up', 'Dreams Don\'t Expire', 'Perseverance', 'Health Transformation', 'Education at Any Age', 'Grief to Purpose'];
  const moods: string[] = ['Inspiring', 'Hopeful', 'Uplifting', 'Empowering', 'Moving', 'Transformative'];
  return { genres, themes, moods };
}

async function seedAgeDefiance1() {
  console.log('🎤 Seeding "Age Defiance: Starting Over Later in Life" to Modern Voices Collection...\n');

  const storyId = 'age-defiance-1';
  const metadata = getAgeDefiance1Metadata();

  // 194 sentences for A1 level, average 8.7 words/sentence, 80 WPM (A1 reading speed)
  const sentences = 194;
  const bundles = 40; // ~5 sentences per bundle
  const readingTime = Math.ceil((sentences * 8.7) / 80); // ~21 minutes

  const ageDefiance1Story = {
    id: storyId,
    title: 'Age Defiance: Starting Over Later in Life',
    author: 'BookBridge',
    description: 'At sixty-four, Grace completed a swim that had defeated her at twenty-eight. At sixty-nine, she graduated from college. At fifty-six, she became a world champion bodybuilder. This powerful composite story shows how one woman proved that dreams don\'t expire, age is just a number, and it\'s never too late to start over. Through swimming, education, and health transformation, Grace\'s journey inspires millions. A moving tale about perseverance, grief to purpose, and proving that life doesn\'t end at sixty. A1 level with Sarah voice.',
    sentences: sentences,
    bundles: bundles,
    gradient: 'from-amber-500 to-orange-600',
    abbreviation: 'AD1'
  };

  const book = await prisma.featuredBook.upsert({
    where: { slug: ageDefiance1Story.id },
    create: {
      slug: ageDefiance1Story.id,
      title: ageDefiance1Story.title,
      author: ageDefiance1Story.author,
      description: ageDefiance1Story.description,
      sentences: ageDefiance1Story.sentences,
      bundles: ageDefiance1Story.bundles,
      gradient: convertGradient(ageDefiance1Story.gradient),
      abbreviation: ageDefiance1Story.abbreviation,
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
      title: ageDefiance1Story.title,
      author: ageDefiance1Story.author,
      description: ageDefiance1Story.description,
      sentences: ageDefiance1Story.sentences,
      bundles: ageDefiance1Story.bundles,
      gradient: convertGradient(ageDefiance1Story.gradient),
      abbreviation: ageDefiance1Story.abbreviation,
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
      sortOrder: 25, // 21st story in Modern Voices collection (after single-parent-rising-2 at 24)
    },
    update: {
      sortOrder: 25,
    },
  });
  console.log(`✅ Added "${book.title}" to "${modernVoicesCollection.name}" collection`);
  console.log(`\n🎉 Seeding complete!\n`);
  console.log(`📊 Story Stats:`);
  console.log(`   - Sentences: ${sentences}`);
  console.log(`   - Bundles: ${bundles}`);
  console.log(`   - Reading Time: ~${readingTime} minutes`);
  console.log(`   - Level: A1`);
  console.log(`   - Voice: Sarah`);
  console.log(`   - Composite Story: 4 sources (Diana Nyad, Ernestine Shepherd, Merrill Cooper, Priscilla Sitienei)`);
}

seedAgeDefiance1()
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

