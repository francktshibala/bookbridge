import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const prisma = new PrismaClient();

async function checkSimplificationsDirect() {
  const booksToCheck = [
    { id: 'gutenberg-64317', title: 'The Great Gatsby' },
    { id: 'gutenberg-215', title: 'The Call of the Wild' },
    { id: 'gutenberg-158', title: 'Emma' },
    { id: 'gutenberg-844', title: 'The Importance of Being Earnest' }
  ];
  
  console.log('🔍 Checking for simplifications directly in book_chunks...\n');
  
  for (const book of booksToCheck) {
    console.log(`\n📚 ${book.title} (${book.id})`);
    
    // Check all chunks for this book
    const chunks = await prisma.bookChunk.findMany({
      where: { 
        bookId: book.id
      },
      select: {
        cefrLevel: true,
        isSimplified: true,
        audioFilePath: true,
        chunkText: true
      }
    });
    
    if (chunks.length === 0) {
      console.log('   ❌ No chunks found in database');
      continue;
    }
    
    // Group by CEFR level
    const chunksByCefr = chunks.reduce((acc, chunk) => {
      if (!acc[chunk.cefrLevel]) acc[chunk.cefrLevel] = { 
        total: 0, 
        simplified: 0,
        withAudio: 0 
      };
      acc[chunk.cefrLevel].total++;
      if (chunk.isSimplified) acc[chunk.cefrLevel].simplified++;
      if (chunk.audioFilePath) acc[chunk.cefrLevel].withAudio++;
      return acc;
    }, {} as Record<string, { total: number; simplified: number; withAudio: number }>);
    
    console.log(`   📊 Total chunks: ${chunks.length}`);
    console.log('   📊 By CEFR level:');
    
    const cefrLevels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'original'];
    cefrLevels.forEach(level => {
      if (chunksByCefr[level]) {
        const stats = chunksByCefr[level];
        console.log(`      ${level}: ${stats.total} chunks (${stats.simplified} simplified, ${stats.withAudio} with audio)`);
      }
    });
    
    const totalSimplified = chunks.filter(c => c.isSimplified && c.cefrLevel !== 'original').length;
    const totalWithAudio = chunks.filter(c => c.audioFilePath).length;
    
    if (totalSimplified > 0) {
      console.log(`   ✅ Has ${totalSimplified} simplified chunks`);
      console.log(`   🎵 Audio status: ${totalWithAudio}/${totalSimplified} simplified chunks have audio`);
      
      if (totalWithAudio === 0) {
        console.log('   ⚡ Ready for audio generation!');
      }
    } else {
      console.log('   ❌ No simplified content found');
    }
  }
  
  await prisma.$disconnect();
}

checkSimplificationsDirect().catch(console.error);