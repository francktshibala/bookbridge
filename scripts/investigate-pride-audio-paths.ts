import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const prisma = new PrismaClient();

async function investigatePrideAudioPaths() {
  console.log('🔍 Investigating Pride and Prejudice audio paths...\n');
  
  try {
    // Get sample audio paths from database
    const sampleChunks = await prisma.bookChunk.findMany({
      where: { 
        bookId: 'gutenberg-1342',
        audioFilePath: { not: null }
      },
      select: {
        cefrLevel: true,
        chunkIndex: true,
        audioFilePath: true,
      },
      orderBy: [
        { cefrLevel: 'asc' },
        { chunkIndex: 'asc' }
      ],
      take: 10 // Just sample first 10
    });
    
    console.log('📋 Sample audio file paths in database:');
    sampleChunks.forEach((chunk, i) => {
      console.log(`  ${i + 1}. ${chunk.cefrLevel}/chunk_${chunk.chunkIndex}:`);
      console.log(`     ${chunk.audioFilePath}`);
    });
    
    // Check pattern analysis
    const hasGenericPaths = sampleChunks.some(chunk => 
      chunk.audioFilePath && !chunk.audioFilePath.includes('gutenberg-1342')
    );
    
    const hasBookSpecificPaths = sampleChunks.some(chunk => 
      chunk.audioFilePath && chunk.audioFilePath.includes('gutenberg-1342')
    );
    
    console.log('\n🔍 Path Analysis:');
    console.log(`  Generic paths (BAD): ${hasGenericPaths ? '❌ FOUND' : '✅ None found'}`);
    console.log(`  Book-specific paths (GOOD): ${hasBookSpecificPaths ? '✅ FOUND' : '❌ Missing'}`);
    
    // Count by path type
    const allChunks = await prisma.bookChunk.findMany({
      where: { 
        bookId: 'gutenberg-1342',
        audioFilePath: { not: null }
      },
      select: {
        audioFilePath: true,
      }
    });
    
    const genericPaths = allChunks.filter(chunk => 
      chunk.audioFilePath && !chunk.audioFilePath.includes('gutenberg-1342')
    );
    
    const bookSpecificPaths = allChunks.filter(chunk => 
      chunk.audioFilePath && chunk.audioFilePath.includes('gutenberg-1342')
    );
    
    console.log('\n📊 Path Distribution:');
    console.log(`  Total chunks with audio: ${allChunks.length}`);
    console.log(`  Generic paths: ${genericPaths.length} ${genericPaths.length > 0 ? '⚠️' : ''}`);
    console.log(`  Book-specific paths: ${bookSpecificPaths.length} ${bookSpecificPaths.length > 0 ? '✅' : '❌'}`);
    
    if (genericPaths.length > 0) {
      console.log('\n⚠️ ISSUE CONFIRMED: Pride and Prejudice has generic paths that were likely overwritten!');
      console.log('\n🔧 SOLUTION: Need to regenerate audio with book-specific paths');
      
      // Show examples of problematic paths
      console.log('\n📋 Examples of problematic paths:');
      genericPaths.slice(0, 3).forEach((chunk, i) => {
        console.log(`  ${i + 1}. ${chunk.audioFilePath}`);
      });
      
      console.log('\n✅ These should be changed to format like:');
      console.log('  https://.../audio-files/gutenberg-1342/a1/chunk_0.mp3');
    }
    
  } catch (error) {
    console.error('❌ Error investigating audio paths:', error);
  } finally {
    await prisma.$disconnect();
  }
}

investigatePrideAudioPaths().catch(console.error);