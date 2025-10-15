import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const BOOK_ID = 'jane-eyre-scale-test-001';

async function checkExisting() {
  try {
    const existing = await prisma.bookSimplification.findFirst({
      where: {
        bookId: BOOK_ID,
        targetLevel: 'A1'
      }
    });

    if (existing) {
      console.log('✅ Found existing A1 simplification:');
      console.log(`- Word count: ${existing.wordCount}`);
      console.log(`- Simplified text length: ${existing.simplifiedText?.length || 0} characters`);
      console.log(`- Created: ${existing.createdAt}`);

      if (existing.simplifiedText && existing.simplifiedText.length > 10000) {
        console.log('📝 Text sample:', existing.simplifiedText.substring(0, 200) + '...');
        console.log('\n🎯 READY TO GENERATE BUNDLES - A1 simplification already exists!');
      } else {
        console.log('❌ Simplification exists but text is incomplete');
      }
    } else {
      console.log('❌ No A1 simplification found');
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkExisting();