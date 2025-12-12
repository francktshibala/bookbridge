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

function getMedicalCrisis2Metadata() {
  const genres: string[] = ['Modern Story', 'Inspirational', 'Medical Recovery'];
  const themes: string[] = ['Medical Crisis Overcome', 'Proving the Impossible Possible', 'Resilience', 'Determination', 'Overcoming Adversity', 'Building New Life', 'Persistence Despite Setbacks', 'First-Time Courage'];
  const moods: string[] = ['Inspiring', 'Hopeful', 'Empowering', 'Resilient', 'Transformative', 'Courageous'];
  return { genres, themes, moods };
}

async function seedMedicalCrisis2() {
  console.log('🎤 Seeding "Impossible Possible: Overcoming Medical Crisis" to Modern Voices Collection...\n');

  const storyId = 'medical-crisis-2';
  const metadata = getMedicalCrisis2Metadata();

  // Based on A1 simplified text (189 sentences, 1,804 words)
  const sentences = 189;
  const bundles = 38; // ~5 sentences per bundle (189 / 5 = 37.8 -> 38 bundles)
  const readingTime = Math.ceil(1804 / 80); // A1 reading speed ~80 words/min -> ~23 minutes

  const medicalCrisis2Story = {
    id: storyId,
    title: 'Impossible Possible: Overcoming Medical Crisis',
    author: 'BookBridge',
    description: 'Sarah was nineteen when meningitis struck, giving her less than two percent chance to live. She lost both legs but refused to give up. Jake was thirteen when cancer gave him three months to live. At fifteen, a second cancer gave him fourteen days. He lost a lung but chose to focus on living. These two people proved that the impossible is possible. Through determination, creativity, and passion, Sarah became a Paralympic snowboarder and Dancing with the Stars finalist. Jake became the first cancer survivor to climb Mount Everest with one lung. This powerful composite story shows that no matter what happens, you can choose to fight and prove everyone wrong. A1 level with Jane voice.',
    sentences: sentences,
    bundles: bundles,
    gradient: 'from-rose-500 to-pink-600',
    abbreviation: 'MC2'
  };

  const book = await prisma.featuredBook.upsert({
    where: { slug: medicalCrisis2Story.id },
    create: {
      slug: medicalCrisis2Story.id,
      title: medicalCrisis2Story.title,
      author: medicalCrisis2Story.author,
      description: medicalCrisis2Story.description,
      sentences: medicalCrisis2Story.sentences,
      bundles: medicalCrisis2Story.bundles,
      gradient: convertGradient(medicalCrisis2Story.gradient),
      abbreviation: medicalCrisis2Story.abbreviation,
      genres: metadata.genres,
      themes: metadata.themes,
      moods: metadata.moods,
      readingTimeMinutes: readingTime,
      difficultyScore: 0.2, // A1 level - very easy
      popularityScore: 89,
      isClassic: false, // Modern Voices collection
      isFeatured: true,
      isNew: true,
    },
    update: {
      title: medicalCrisis2Story.title,
      author: medicalCrisis2Story.author,
      description: medicalCrisis2Story.description,
      sentences: medicalCrisis2Story.sentences,
      bundles: medicalCrisis2Story.bundles,
      gradient: convertGradient(medicalCrisis2Story.gradient),
      abbreviation: medicalCrisis2Story.abbreviation,
      genres: metadata.genres,
      themes: metadata.themes,
      moods: metadata.moods,
      readingTimeMinutes: readingTime,
      difficultyScore: 0.2,
      popularityScore: 89,
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
      sortOrder: 26, // After youth-activism-1 at 25
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
  console.log(`   - Voice: Jane`);
  console.log(`   - Composite Story: 2 sources (Amy Purdy, Sean Swarner)`);
}

seedMedicalCrisis2()
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

