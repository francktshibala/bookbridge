import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const prisma = new PrismaClient();
const BOOK_ID = 'custom-story-500';
const CEFR_LEVEL = 'B1';
const CACHE_FILE = `./cache/custom-story-500-${CEFR_LEVEL}-simplified.json`;

async function saveCachedSimplification() {
  console.log('💾 Loading cached simplification...');

  const cached = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
  const simplifiedText = cached.map(s => s.text).join(' ');

  console.log(`Found ${cached.length} sentences`);

  // Use the correct unique constraint fields from schema.prisma
  await prisma.bookSimplification.upsert({
    where: {
      bookId_targetLevel_chunkIndex_versionKey: {
        bookId: BOOK_ID,
        targetLevel: CEFR_LEVEL,
        chunkIndex: 0,
        versionKey: 'v1'
      }
    },
    update: {
      simplifiedText: simplifiedText
    },
    create: {
      bookId: BOOK_ID,
      targetLevel: CEFR_LEVEL,
      chunkIndex: 0,
      originalText: 'Custom modern adventure story',
      simplifiedText: simplifiedText,
      vocabularyChanges: [],
      culturalAnnotations: [],
      qualityScore: null,
      versionKey: 'v1'
    }
  });

  console.log('✅ Cached simplification saved to database!');
  console.log(`\nNext step: Generate audio bundles with:`);
  console.log(`CEFR_LEVEL=B1 node scripts/generate-custom-story-bundles.js`);
}

saveCachedSimplification()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('❌ Error:', error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());