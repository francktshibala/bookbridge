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

function getMedicalCrisis1Metadata() {
  const genres: string[] = ['Modern Story', 'Inspirational', 'Medical Crisis'];
  const themes: string[] = ['Hope', 'Resilience', 'Family Support', 'Identity Loss', 'Communication Barriers', 'Rebuilding', 'Medical Recovery', 'Finding New Purpose'];
  const moods: string[] = ['Inspiring', 'Emotional', 'Uplifting', 'Resilient', 'Hopeful', 'Triumphant'];
  return { genres, themes, moods };
}

async function seedMedicalCrisis1() {
  console.log('🎤 Seeding "Finding New Wings: A Medical Crisis Story" to Modern Voices Collection...\n');

  const storyId = 'medical-crisis-1';
  const metadata = getMedicalCrisis1Metadata();

  // 300 sentences for A1 level, average 6 words/sentence, 85 WPM
  const sentences = 300;
  const bundles = 50; // ~6 sentences per bundle
  const readingTime = Math.ceil((sentences * 6) / 85); // ~21 minutes

  const medicalCrisis1Story = {
    id: storyId,
    title: 'Finding New Wings: A Medical Crisis Story',
    author: 'BookBridge',
    description: 'An inspiring composite story about Rachel, who experiences a sudden stroke that takes away her ability to speak. Through her daughter Emma\'s unwavering support and the wisdom of "pole pole" (slowly, slowly), Rachel learns that recovery isn\'t about becoming who you were before—it\'s about discovering who you can become. Like a pelican with a broken wing learning to swim, Rachel finds new ways to be herself. A1 level with Jane voice.',
    sentences: sentences,
    bundles: bundles,
    gradient: 'from-rose-500 to-pink-600',
    abbreviation: 'MC1'
  };

  const book = await prisma.featuredBook.upsert({
    where: { slug: medicalCrisis1Story.id },
    create: {
      slug: medicalCrisis1Story.id,
      title: medicalCrisis1Story.title,
      author: medicalCrisis1Story.author,
      description: medicalCrisis1Story.description,
      sentences: medicalCrisis1Story.sentences,
      bundles: medicalCrisis1Story.bundles,
      gradient: convertGradient(medicalCrisis1Story.gradient),
      abbreviation: medicalCrisis1Story.abbreviation,
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
      title: medicalCrisis1Story.title,
      author: medicalCrisis1Story.author,
      description: medicalCrisis1Story.description,
      sentences: medicalCrisis1Story.sentences,
      bundles: medicalCrisis1Story.bundles,
      gradient: convertGradient(medicalCrisis1Story.gradient),
      abbreviation: medicalCrisis1Story.abbreviation,
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
      sortOrder: 13, // 14th story in Modern Voices collection
    },
    update: {
      sortOrder: 13,
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
  console.log(`   - Composite Story: 6 sources (Jill, Andy, Celeste, Anne, Richard, Janine)`);
}

seedMedicalCrisis1()
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
