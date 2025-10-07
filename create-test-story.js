import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';

config({ path: '.env.local' });
const prisma = new PrismaClient();

const BOOK_ID = 'digital-library-test';

// Test story with optimal sentence length (10-15 words each)
const testStory = `The Digital Library

Emma loved reading books but her local library was very far away. She lived in a small town where technology was helping people every day. One morning, she discovered an amazing new app that would change everything completely. The app was called BookBridge and it made reading much easier than before.

She opened the app and found thousands of books in different languages available. The stories were read aloud by natural voices that sounded like real people. Emma could listen while walking to school or doing her homework assignments. This was exactly what she had been looking for all her life.

She started with a simple story about friendship and adventure in faraway places. The voice was so clear and pleasant that she forgot she wasn't reading. When the first chapter ended, she wanted to continue listening immediately without stopping. Emma realized that technology could make learning fun and accessible for everyone around.

Her teacher noticed that Emma was reading more books than ever before now. Emma shared the app with her classmates and they all started reading together. The whole school became excited about discovering new stories through this amazing technology. Soon everyone was talking about their favorite books and sharing reading recommendations daily.

Emma learned that the best inventions help people connect with knowledge and dreams. Technology works best when it makes beautiful things like books available to everyone. Her small town library noticed more visitors coming to borrow physical books too. The digital library had made reading popular again in ways nobody had expected.`;

async function createTestStory() {
  console.log('📚 Creating "The Digital Library" test story...');

  try {
    // Delete existing test book
    await prisma.bookContent.deleteMany({
      where: { bookId: BOOK_ID }
    });

    await prisma.bookChunk.deleteMany({
      where: { bookId: BOOK_ID }
    });

    // Create BookContent (matching actual schema)
    const wordCount = testStory.split(/\s+/).length;
    await prisma.bookContent.create({
      data: {
        id: BOOK_ID,
        bookId: BOOK_ID,
        title: 'The Digital Library',
        author: 'BookBridge Team',
        fullText: testStory,
        wordCount: wordCount,
        totalChunks: 5
      }
    });

    console.log('✅ Created test story in BookContent');

    // Split into sentences and analyze
    const sentences = testStory
      .replace(/The Digital Library\n\n/, '') // Remove title
      .split(/(?<=[.!?])\s+/)
      .map(s => s.trim())
      .filter(s => s.length > 10);

    console.log(`📊 Story Analysis:`);
    console.log(`   - Total sentences: ${sentences.length}`);

    sentences.forEach((sentence, i) => {
      const words = sentence.split(/\s+/).length;
      console.log(`   - S${i+1}: ${words} words - "${sentence.substring(0, 50)}..."`);
    });

    // Create 5 bundles (4 sentences each)
    const bundles = [];
    for (let i = 0; i < sentences.length; i += 4) {
      const bundleSentences = sentences.slice(i, i + 4);
      if (bundleSentences.length === 4) {
        bundles.push({
          index: Math.floor(i / 4),
          sentences: bundleSentences,
          text: bundleSentences.join(' ')
        });
      }
    }

    console.log(`🎵 Created ${bundles.length} bundles for testing`);

    // Store bundles in BookChunk table
    for (const bundle of bundles) {
      const bundleWordCount = bundle.text.split(/\s+/).length;
      await prisma.bookChunk.create({
        data: {
          bookId: BOOK_ID,
          cefrLevel: 'A2',
          chunkIndex: bundle.index,
          chunkText: bundle.text,
          wordCount: bundleWordCount,
          audioFilePath: `${BOOK_ID}/A2/test/bundle_${bundle.index}.mp3`
        }
      });
    }

    console.log('✅ Test story ready for audio generation');
    console.log('💡 Next: Create generation script for digital-library-test');

  } catch (error) {
    console.error('❌ Error creating test story:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestStory();