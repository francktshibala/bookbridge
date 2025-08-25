#!/usr/bin/env node

import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const prisma = new PrismaClient();

async function finalVerification() {
  // Check BookContent exists
  const content = await prisma.bookContent.findFirst({
    where: { bookId: 'gutenberg-1952' }
  });
  
  if (!content) {
    console.log('❌ No BookContent found');
    return;
  }
  
  console.log('✅ BookContent exists:', content.title);
  console.log('   Author:', content.author);
  console.log('   Word count:', content.wordCount.toLocaleString());
  console.log('   Era:', content.era);
  
  // Check BookChunk entries by level
  const chunksByLevel = await prisma.bookChunk.groupBy({
    by: ['cefrLevel'],
    where: { 
      bookId: 'gutenberg-1952',
      cefrLevel: { not: 'original' } // Only simplified levels for audio
    },
    _count: { _all: true },
    orderBy: { cefrLevel: 'asc' }
  });
  
  console.log('\n📊 Chunks ready for audio generation:');
  let totalChunks = 0;
  chunksByLevel.forEach(level => {
    console.log(`   ${level.cefrLevel}: ${level._count._all} chunks`);
    totalChunks += level._count._all;
  });
  
  console.log(`\n📈 Total audio files to generate: ${totalChunks}`);
  console.log('✅ Ready for audio generation on other computer!');
  
  await prisma.$disconnect();
}

if (require.main === module) {
  finalVerification().catch(console.error);
}