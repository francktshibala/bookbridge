const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

async function debugPrecomputedCoverage() {
  console.log('🔍 DEBUGGING PRECOMPUTED AUDIO COVERAGE');
  
  try {
    // Check which chunks exist for Pride & Prejudice
    const chunks = await prisma.bookChunk.findMany({
      where: {
        bookId: 'gutenberg-1342',
        cefrLevel: 'original'
      },
      orderBy: { chunkIndex: 'asc' },
      select: {
        id: true,
        chunkIndex: true,
        chunkText: true
      }
    });
    
    console.log(`\n📚 Total chunks available: ${chunks.length}`);
    console.log('Chunk indexes:', chunks.map(c => c.chunkIndex).join(', '));
    
    // Check which chunks have precomputed audio
    const audioSegments = await prisma.audioSegment.findMany({
      where: {
        bookId: 'gutenberg-1342'
      },
      orderBy: {
        chunkId: 'asc'
      },
      select: {
        id: true,
        chunkId: true,
        endTime: true,
        audioBlob: true
      }
    });
    
    console.log(`\n🎵 Audio segments stored: ${audioSegments.length}`);
    
    // Map chunks to their audio availability
    const chunkAudioMap = {};
    for (const segment of audioSegments) {
      const chunk = chunks.find(c => c.id === segment.chunkId);
      if (chunk) {
        chunkAudioMap[chunk.chunkIndex] = {
          duration: segment.endTime,
          hasBlob: !!segment.audioBlob,
          blobSize: segment.audioBlob ? (segment.audioBlob.length / 1024).toFixed(1) + 'KB' : 'none'
        };
      }
    }
    
    console.log('\n📊 CHUNK AUDIO AVAILABILITY:');
    for (let i = 0; i < Math.min(chunks.length, 15); i++) {
      const audio = chunkAudioMap[i];
      const status = audio 
        ? `✅ ${audio.duration}s, ${audio.blobSize}` 
        : '❌ No precomputed audio';
      
      console.log(`   Chunk ${i}: ${status}`);
    }
    
    // Show specifically what happens for chunk 9
    console.log('\n🎯 CHUNK 9 ANALYSIS:');
    const chunk9 = chunks.find(c => c.chunkIndex === 9);
    if (chunk9) {
      console.log(`   Chunk 9 exists: ${chunk9.id}`);
      console.log(`   Text preview: ${chunk9.chunkText.substring(0, 100)}...`);
      
      const audio9 = chunkAudioMap[9];
      if (audio9) {
        console.log(`   ✅ Has precomputed audio: ${audio9.duration}s, ${audio9.blobSize}`);
      } else {
        console.log(`   ❌ NO precomputed audio - will use real-time generation (12+ sec delay)`);
      }
    } else {
      console.log('   ❌ Chunk 9 not found in database');
    }
    
    // Summary
    const precomputedChunks = Object.keys(chunkAudioMap).map(Number);
    const missingChunks = chunks.map(c => c.chunkIndex).filter(i => !chunkAudioMap[i]);
    
    console.log('\n📈 SUMMARY:');
    console.log(`   Precomputed chunks: ${precomputedChunks.join(', ')} (${precomputedChunks.length} total)`);
    console.log(`   Missing audio: chunks ${missingChunks.slice(0, 10).join(', ')}${missingChunks.length > 10 ? '...' : ''} (${missingChunks.length} total)`);
    console.log(`   Coverage: ${((precomputedChunks.length / chunks.length) * 100).toFixed(1)}%`);
    
    if (missingChunks.includes(9)) {
      console.log('\n🚨 ISSUE IDENTIFIED:');
      console.log('   You are on chunk 9 which has NO precomputed audio');
      console.log('   This causes the 12+ second delay you\'re experiencing');
      console.log('   Solution: Generate audio for chunks 6-15 for better coverage');
    }
    
  } catch (error) {
    console.error('❌ Debug error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

debugPrecomputedCoverage();