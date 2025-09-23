import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const prisma = new PrismaClient();
const BOOK_ID = 'jane-eyre-scale-test-001';
const CEFR_LEVEL = 'A1';

async function saveCachedData() {
  console.log('📚 Saving cached Jane Eyre A1 simplification to database...');

  try {
    // Read cached data
    const cache = JSON.parse(fs.readFileSync('./cache/jane-eyre-A1-simplified.json', 'utf8'));
    console.log(`✅ Found ${cache.length} sentences in cache`);

    // Join all text
    const simplifiedText = cache.map(s => s.text).join(' ');
    console.log(`📝 Total text length: ${simplifiedText.length} characters`);

    // Save to database using correct field names
    const result = await prisma.bookSimplification.upsert({
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
        originalText: 'Full Jane Eyre text',
        simplifiedText: simplifiedText,
        vocabularyChanges: [],
        culturalAnnotations: [],
        qualityScore: null,
        versionKey: 'v1'
      }
    });

    console.log('✅ Successfully saved to database!');
    console.log('📊 Book ID:', result.bookId);
    console.log('📊 Level:', result.targetLevel);
    console.log('📊 Sentences:', cache.length);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

saveCachedData();