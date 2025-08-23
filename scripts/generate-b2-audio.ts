import { PrismaClient } from '@prisma/client';
import { AudioService } from '../lib/services/audio-service';
import fs from 'fs/promises';
import path from 'path';

const prisma = new PrismaClient();

async function generateB2Audio() {
  try {
    console.log('Starting B2 audio generation for Pride & Prejudice...');
    
    // First check what B2 chunks exist
    const b2Chunks = await prisma.bookChunk.findMany({
      where: {
        bookId: 'pride-and-prejudice',
        eslLevel: 'B2'
      },
      orderBy: { chunkIndex: 'asc' }
    });
    
    console.log(`Found ${b2Chunks.length} B2 chunks`);
    
    if (b2Chunks.length === 0) {
      console.log('No B2 chunks found in database!');
      return;
    }
    
    // Check how many already have audio
    const withAudio = b2Chunks.filter(chunk => chunk.audioFilePath).length;
    console.log(`${withAudio} chunks already have audio paths`);
    
    // Clear existing audio paths to force regeneration
    if (withAudio > 0) {
      console.log('Clearing existing audio paths to force regeneration...');
      await prisma.bookChunk.updateMany({
        where: {
          bookId: 'pride-and-prejudice',
          eslLevel: 'B2'
        },
        data: {
          audioFilePath: null
        }
      });
    }
    
    // Initialize audio service
    const audioService = AudioService.getInstance();
    let generated = 0;
    let errors = 0;
    
    // Process each chunk
    for (const chunk of b2Chunks) {
      try {
        process.stdout.write(`\rGenerating audio for chunk ${chunk.chunkIndex + 1}/${b2Chunks.length}...`);
        
        const audioBuffer = await audioService.generateSpeech(
          chunk.content,
          'openai',
          { voice: 'nova' }
        );
        
        // Save to file
        const audioDir = path.join('public/audio/pride-and-prejudice/B2');
        await fs.mkdir(audioDir, { recursive: true });
        
        const fileName = `chunk_${chunk.chunkIndex}.mp3`;
        const filePath = path.join(audioDir, fileName);
        await fs.writeFile(filePath, audioBuffer);
        
        // Update database with URL path
        const audioUrl = `/audio/pride-and-prejudice/B2/${fileName}`;
        await prisma.bookChunk.update({
          where: { id: chunk.id },
          data: { audioFilePath: audioUrl }
        });
        
        generated++;
      } catch (error: any) {
        console.error(`\nError generating audio for chunk ${chunk.chunkIndex}:`, error.message);
        errors++;
      }
    }
    
    console.log(`\n\nB2 Audio generation complete!`);
    console.log(`Generated: ${generated} files`);
    console.log(`Errors: ${errors}`);
    console.log(`Total size: ${await getTotalSize()}`);
    
  } catch (error) {
    console.error('Fatal error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

async function getTotalSize() {
  try {
    const dir = 'public/audio/pride-and-prejudice/B2';
    const files = await fs.readdir(dir);
    let totalSize = 0;
    
    for (const file of files) {
      const stats = await fs.stat(path.join(dir, file));
      totalSize += stats.size;
    }
    
    return `${(totalSize / 1024 / 1024).toFixed(2)} MB`;
  } catch {
    return 'unknown';
  }
}

generateB2Audio();