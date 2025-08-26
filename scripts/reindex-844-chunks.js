#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function reindexChunks() {
  console.log('🔧 REINDEXING GUTENBERG-844 CHUNKS TO START FROM 0...\n');
  
  const levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
  
  for (const level of levels) {
    const chunks = await prisma.bookChunk.findMany({
      where: { bookId: 'gutenberg-844', cefrLevel: level },
      orderBy: { chunkIndex: 'asc' }
    });
    
    console.log(`📋 ${level}: Found ${chunks.length} chunks`);
    
    // Map old index to new sequential index starting from 0
    for (let i = 0; i < chunks.length; i++) {
      const oldIndex = chunks[i].chunkIndex;
      const newIndex = i;
      
      if (oldIndex !== newIndex) {
        await prisma.bookChunk.update({
          where: { id: chunks[i].id },
          data: { chunkIndex: newIndex }
        });
        console.log(`   ✅ Chunk ${oldIndex} → ${newIndex}`);
      }
    }
  }
  
  console.log('\n✅ REINDEXING COMPLETE!');
  console.log('All chunks now start from index 0 for proper reading page display.');
  
  await prisma.$disconnect();
}

reindexChunks();