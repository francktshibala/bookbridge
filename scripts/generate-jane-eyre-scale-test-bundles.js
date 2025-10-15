import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const prisma = new PrismaClient();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// UNIQUE IDENTIFIERS TO AVOID PATH CONFLICTS
const BOOK_ID = 'jane-eyre-scale-test-001';  // Unique ID to prevent conflicts
const TEMP_DIR = '/tmp/jane-eyre-scale-test-bundles';  // Unique temp directory
const SENTENCES_PER_BUNDLE = 4;
const BOOK_TITLE = 'Jane Eyre (Scale Test)';
const BOOK_AUTHOR = 'Charlotte Brontë';

class JaneEyreScaleTestGenerator {
  async generateBundles() {
    console.log('📚 Starting Jane Eyre Scale Test bundle generation...');
    console.log(`📋 Book ID: ${BOOK_ID} (unique to prevent conflicts)`);
    console.log(`📂 Temp Directory: ${TEMP_DIR}`);

    // Create temp directory
    if (!fs.existsSync(TEMP_DIR)) {
      fs.mkdirSync(TEMP_DIR, { recursive: true });
    }

    // Read the raw book text
    const rawText = fs.readFileSync('public/books/scale-test/jane-eyre-raw.txt', 'utf8');

    // Extract main content (skip Gutenberg header)
    const startMarker = 'CHAPTER I';
    const endMarker = '*** END OF THE PROJECT GUTENBERG EBOOK';
    const startIndex = rawText.indexOf(startMarker);
    const endIndex = rawText.indexOf(endMarker);

    if (startIndex === -1 || endIndex === -1) {
      throw new Error('Could not find book boundaries');
    }

    const bookText = rawText.substring(startIndex, endIndex);
    const wordCount = bookText.split(/\s+/).length;

    console.log(`📊 Book Statistics:`);
    console.log(`   - Total words: ${wordCount.toLocaleString()}`);
    console.log(`   - Estimated pages: ${Math.round(wordCount / 250)}`);

    // Split into sentences
    const sentences = this.splitIntoSentences(bookText);
    const totalSentences = sentences.length;
    const totalBundles = Math.ceil(totalSentences / SENTENCES_PER_BUNDLE);

    console.log(`   - Total sentences: ${totalSentences.toLocaleString()}`);
    console.log(`   - Total bundles (4 sentences each): ${totalBundles.toLocaleString()}`);
    console.log(`   - CDN requests reduced from ${totalSentences.toLocaleString()} to ${totalBundles.toLocaleString()}`);

    // Store in database with unique book ID
    await this.storeBookContent(bookText, wordCount, totalBundles);

    // Process for original level first (for scale testing)
    await this.processSingleLevel('original', bookText, sentences);

    console.log('\n🎉 Jane Eyre scale test preparation complete!');
    console.log('\n📝 Terminal Commands for Simplification and Audio Generation:');
    console.log('─'.repeat(60));
    console.log('\n# Step 1: Generate simplifications for different CEFR levels');
    console.log(`node scripts/simplify-book.js ${BOOK_ID} A1`);
    console.log(`node scripts/simplify-book.js ${BOOK_ID} A2`);
    console.log(`node scripts/simplify-book.js ${BOOK_ID} B1`);
    console.log(`node scripts/simplify-book.js ${BOOK_ID} B2`);
    console.log('\n# Step 2: Generate audio bundles');
    console.log(`node scripts/generate-audio-bundles.js ${BOOK_ID} original`);
    console.log(`node scripts/generate-audio-bundles.js ${BOOK_ID} A1`);
    console.log(`node scripts/generate-audio-bundles.js ${BOOK_ID} A2`);
    console.log(`node scripts/generate-audio-bundles.js ${BOOK_ID} B1`);
    console.log(`node scripts/generate-audio-bundles.js ${BOOK_ID} B2`);
    console.log('\n# Step 3: Test the scale');
    console.log(`Open: http://localhost:3000/featured-books?bookId=${BOOK_ID}&level=original`);
    console.log('─'.repeat(60));
  }

  splitIntoSentences(text) {
    // More sophisticated sentence splitting for a real book
    const sentences = [];

    // Split on sentence endings but preserve them
    const rawSentences = text.split(/([.!?]+\s+)/);

    let currentSentence = '';
    for (let i = 0; i < rawSentences.length; i++) {
      currentSentence += rawSentences[i];

      // Check if this looks like a complete sentence
      if (/[.!?]+\s*$/.test(currentSentence) && currentSentence.trim().length > 10) {
        const trimmed = currentSentence.trim();

        // Skip chapter headings and very short fragments
        if (!trimmed.startsWith('CHAPTER') && trimmed.length > 20) {
          sentences.push({
            index: sentences.length,
            text: trimmed
          });
        }
        currentSentence = '';
      }
    }

    return sentences;
  }

  async storeBookContent(fullText, wordCount, totalChunks) {
    console.log(`\n💾 Storing book content with unique ID: ${BOOK_ID}`);

    try {
      // Store in BookContent table
      await prisma.bookContent.upsert({
        where: { bookId: BOOK_ID },
        update: {
          title: BOOK_TITLE,
          author: BOOK_AUTHOR,
          fullText: fullText.substring(0, 50000), // Store first 50k chars for reference
          era: 'victorian',
          wordCount: wordCount,
          totalChunks: totalChunks,
          updatedAt: new Date()
        },
        create: {
          bookId: BOOK_ID,
          title: BOOK_TITLE,
          author: BOOK_AUTHOR,
          fullText: fullText.substring(0, 50000),
          era: 'victorian',
          wordCount: wordCount,
          totalChunks: totalChunks
        }
      });

      // Also ensure Book record exists
      await prisma.book.upsert({
        where: { id: BOOK_ID },
        update: {
          title: BOOK_TITLE,
          author: BOOK_AUTHOR,
          publicDomain: true,
          description: 'Scale test version of Jane Eyre - 185,000+ words for testing bundle architecture',
          genre: 'Classic Literature',
          publishYear: 1847,
          language: 'en',
          updatedAt: new Date()
        },
        create: {
          id: BOOK_ID,
          title: BOOK_TITLE,
          author: BOOK_AUTHOR,
          publicDomain: true,
          description: 'Scale test version of Jane Eyre - 185,000+ words for testing bundle architecture',
          genre: 'Classic Literature',
          publishYear: 1847,
          language: 'en'
        }
      });

      console.log('✅ Book content stored successfully');
    } catch (error) {
      console.error('❌ Error storing book content:', error);
      throw error;
    }
  }

  async processSingleLevel(level, fullText, sentences) {
    console.log(`\n📝 Processing ${level} level...`);

    // Group sentences into bundles
    const bundles = [];
    for (let i = 0; i < sentences.length; i += SENTENCES_PER_BUNDLE) {
      const bundleSentences = sentences.slice(i, i + SENTENCES_PER_BUNDLE);
      bundles.push({
        bundleIndex: Math.floor(i / SENTENCES_PER_BUNDLE),
        sentences: bundleSentences,
        startSentence: i,
        endSentence: Math.min(i + SENTENCES_PER_BUNDLE - 1, sentences.length - 1)
      });
    }

    console.log(`✅ Created ${bundles.length} bundle definitions`);

    // Store bundle metadata in database
    for (const bundle of bundles) {
      const bundleId = `${BOOK_ID}_${level}_bundle_${bundle.bundleIndex}`;

      // Calculate timings (4 seconds per sentence as placeholder)
      const timings = bundle.sentences.map((sentence, idx) => ({
        sentenceIndex: bundle.startSentence + idx,
        startTime: idx * 4.0,
        endTime: (idx + 1) * 4.0,
        text: sentence.text
      }));

      // Store in audio_assets table with unique paths
      await prisma.$executeRaw`
        INSERT INTO audio_assets (
          book_id,
          cefr_level,
          bundle_index,
          cdn_path,
          sentence_timings,
          total_sentences,
          duration,
          created_at
        ) VALUES (
          ${BOOK_ID},
          ${level},
          ${bundle.bundleIndex},
          ${`${BOOK_ID}/${level}/bundle_${bundle.bundleIndex}.mp3`},
          ${JSON.stringify(timings)}::jsonb,
          ${bundle.sentences.length},
          ${bundle.sentences.length * 4.0},
          NOW()
        )
        ON CONFLICT (book_id, cefr_level, bundle_index)
        DO UPDATE SET
          cdn_path = EXCLUDED.cdn_path,
          sentence_timings = EXCLUDED.sentence_timings,
          total_sentences = EXCLUDED.total_sentences,
          duration = EXCLUDED.duration;
      `;
    }

    console.log(`✅ Stored ${bundles.length} bundle metadata records`);
  }
}

// Run the generator
async function main() {
  try {
    const generator = new JaneEyreScaleTestGenerator();
    await generator.generateBundles();
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Execute if run directly
if (process.argv[1] === new URL(import.meta.url).pathname) {
  main();
}

export default JaneEyreScaleTestGenerator;