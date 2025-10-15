import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanupNecklaceA2() {
  try {
    console.log('🗑️ Deleting problematic A2 bundles...');

    const result = await prisma.bookChunk.deleteMany({
      where: {
        bookId: 'the-necklace',
        cefrLevel: 'A2'
      }
    });

    console.log(`✅ Deleted ${result.count} A2 bundles`);
    console.log('🔄 Ready for fresh A2 generation');

  } catch (error) {
    console.error('❌ Cleanup failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanupNecklaceA2();