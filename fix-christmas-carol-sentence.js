import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });

const prisma = new PrismaClient();

async function fixSentence() {
  console.log('🎄 Fixing "So, Marley was dead as a nail" sentence...');

  try {
    // Find the BookChunk with the problematic text
    const chunks = await prisma.bookChunk.findMany({
      where: {
        bookId: 'christmas-carol-enhanced-v2',
        cefrLevel: 'A1',
        chunkText: {
          contains: 'So, Marley was dead as a nail'
        }
      }
    });

    console.log(`📋 Found ${chunks.length} chunk(s) with the problematic text`);

    for (const chunk of chunks) {
      console.log(`🔧 Fixing chunk ${chunk.chunkIndex}...`);

      // Replace the problematic text
      const fixedText = chunk.chunkText.replace(
        'So, Marley was dead as a nail.',
        'Marley was dead as a nail.'
      );

      // Update the chunk
      await prisma.bookChunk.update({
        where: { id: chunk.id },
        data: { chunkText: fixedText }
      });

      console.log(`✅ Fixed chunk ${chunk.chunkIndex}`);
      console.log(`   Before: ${chunk.chunkText.substring(chunk.chunkText.indexOf('So, Marley'), chunk.chunkText.indexOf('So, Marley') + 50)}...`);
      console.log(`   After:  ${fixedText.substring(fixedText.indexOf('Marley was dead'), fixedText.indexOf('Marley was dead') + 50)}...`);
    }

    console.log('🎉 Successfully fixed the sentence!');
    console.log('💡 Next: Regenerate Bundle 1 audio with the corrected text');

  } catch (error) {
    console.error('❌ Error fixing sentence:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixSentence();