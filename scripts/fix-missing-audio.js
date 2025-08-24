const { PrismaClient } = require('@prisma/client');
const { AudioGenerator } = require('../lib/services/audio-generator');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const prisma = new PrismaClient();

async function fixMissingAudio() {
  console.log('🔧 Fixing missing audio files...\n');
  
  // Get missing chunks
  const missingChunks = await prisma.bookChunk.findMany({
    where: { 
      bookId: 'gutenberg-1342',
      audioFilePath: { startsWith: '/audio/' }
    },
    select: { cefrLevel: true, chunkIndex: true, id: true, chunkText: true },
    orderBy: [{ cefrLevel: 'asc' }, { chunkIndex: 'asc' }]
  });

  console.log(`📊 Found ${missingChunks.length} missing chunks to fix`);
  
  const audioGenerator = new AudioGenerator();
  
  for (const chunk of missingChunks) {
    try {
      console.log(`\n🎵 Generating audio for ${chunk.cefrLevel} chunk ${chunk.chunkIndex}...`);
      
      // Generate audio using the same service as the migration
      const audioUrl = await audioGenerator.generateAudio(
        chunk.chunkText,
        'alloy', // Using consistent voice
        'gutenberg-1342',
        chunk.chunkIndex,
        chunk.cefrLevel
      );
      
      if (audioUrl) {
        // Update database with the new audio URL (should be Supabase URL)
        await prisma.bookChunk.update({
          where: { id: chunk.id },
          data: { audioFilePath: audioUrl }
        });
        
        console.log(`✅ Generated and saved: ${chunk.cefrLevel}/chunk_${chunk.chunkIndex}`);
      } else {
        console.log(`❌ Failed to generate: ${chunk.cefrLevel}/chunk_${chunk.chunkIndex}`);
      }
      
      // Small delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 500));
      
    } catch (error) {
      console.error(`❌ Error generating ${chunk.cefrLevel}/chunk_${chunk.chunkIndex}:`, error.message);
    }
  }
  
  console.log('\n🎉 Missing audio generation completed!');
  await prisma.$disconnect();
}

// Run the fix
if (require.main === module) {
  fixMissingAudio().catch(console.error);
}

module.exports = { fixMissingAudio };