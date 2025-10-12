import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanup() {
  console.log('🗑️ Cleaning up lady-with-dog database records...');

  try {
    const result = await prisma.bookChunk.deleteMany({
      where: {
        bookId: 'lady-with-dog',
        cefrLevel: 'A1'
      }
    });

    console.log(`✅ Deleted ${result.count} BookChunk records`);

  } catch (error) {
    console.error('❌ Cleanup failed:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

cleanup();