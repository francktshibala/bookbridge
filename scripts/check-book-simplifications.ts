import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const prisma = new PrismaClient();

async function checkBookSimplifications() {
  const booksToCheck = [
    { id: 'gutenberg-64317', title: 'The Great Gatsby' },
    { id: 'gutenberg-215', title: 'The Call of the Wild' },
    { id: 'gutenberg-158', title: 'Emma' },
    { id: 'gutenberg-844', title: 'The Importance of Being Earnest' }
  ];
  
  console.log('🔍 Checking books for simplifications...\n');
  
  for (const book of booksToCheck) {
    console.log(`\n📚 ${book.title} (${book.id})`);
    
    // Check if book content exists
    const bookContent = await prisma.bookContent.findFirst({
      where: { bookId: book.id }
    });
    
    if (!bookContent) {
      console.log('   ❌ No book content loaded - needs content loading first');
      continue;
    }
    
    console.log('   ✅ Book content loaded');
    
    // Check simplifications
    const simplifiedChunks = await prisma.bookChunk.findMany({
      where: { 
        bookId: book.id,
        isSimplified: true,
        cefrLevel: { not: 'original' }
      },
      select: {
        cefrLevel: true,
        audioFilePath: true
      }
    });
    
    if (simplifiedChunks.length === 0) {
      console.log('   ❌ No simplifications found');
      continue;
    }
    
    // Group by CEFR level
    const chunksByCefr = simplifiedChunks.reduce((acc, chunk) => {
      if (!acc[chunk.cefrLevel]) acc[chunk.cefrLevel] = { total: 0, withAudio: 0 };
      acc[chunk.cefrLevel].total++;
      if (chunk.audioFilePath) acc[chunk.cefrLevel].withAudio++;
      return acc;
    }, {} as Record<string, { total: number; withAudio: number }>);
    
    console.log(`   ✅ Simplifications found: ${simplifiedChunks.length} total chunks`);
    console.log('   📊 By CEFR level:');
    
    Object.entries(chunksByCefr).forEach(([level, stats]) => {
      console.log(`      ${level}: ${stats.total} chunks (${stats.withAudio} with audio)`);
    });
    
    const totalWithAudio = simplifiedChunks.filter(c => c.audioFilePath).length;
    console.log(`   🎵 Audio status: ${totalWithAudio}/${simplifiedChunks.length} chunks have audio`);
    
    if (totalWithAudio === 0) {
      console.log('   ⚡ Ready for audio generation!');
    } else if (totalWithAudio < simplifiedChunks.length) {
      console.log('   ⚠️  Partially generated - needs completion');
    } else {
      console.log('   ✅ Audio generation complete');
    }
  }
  
  await prisma.$disconnect();
}

checkBookSimplifications().catch(console.error);