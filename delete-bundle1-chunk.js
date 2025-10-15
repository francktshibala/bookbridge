import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';

config({ path: '.env.local' });
const prisma = new PrismaClient();

async function deleteBundle1() {
  console.log('🗑️ Deleting Bundle 1 BookChunk record to force regeneration...');

  try {
    const deleted = await prisma.bookChunk.deleteMany({
      where: {
        bookId: 'christmas-carol-enhanced-v2',
        cefrLevel: 'A1',
        chunkIndex: 1
      }
    });

    console.log(`✅ Deleted ${deleted.count} BookChunk record(s) for Bundle 1`);
    console.log('💡 Now run the generation script to regenerate Bundle 1 with fixed text');

  } catch (error) {
    console.error('❌ Error deleting BookChunk:', error);
  } finally {
    await prisma.$disconnect();
  }
}

deleteBundle1();