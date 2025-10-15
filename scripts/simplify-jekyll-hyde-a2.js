import { PrismaClient } from '@prisma/client';
import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });

const prisma = new PrismaClient();
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const BOOK_ID = 'gutenberg-43'; // Jekyll & Hyde ID
const CEFR_LEVEL = 'A2';
const BATCH_SIZE = 20; // Process 20 sentences at a time
const PROJECT_ROOT = path.resolve(process.cwd());
const CACHE_FILE = path.join(PROJECT_ROOT, 'cache', 'jekyll-hyde-a2-natural.json');

class JekyllHydeA2Simplifier {
  constructor() {
    this.isPilot = process.argv.includes('--pilot');
    this.maxBatches = this.isPilot ? 5 : Infinity; // Pilot: 5 batches = 100 sentences = 25 bundles
    this.clearCache = process.argv.includes('--clear-cache');
  }

  async simplifyToA2() {
    console.log('📚 Starting Jekyll & Hyde A2 Simplification with Natural Compound Sentences...');

    if (this.isPilot) {
      console.log('🧪 PILOT MODE: Processing first 100 sentences only (~$0.50 cost)');
    }

    // Load modernized text from cache
    const modernizedPath = path.join(PROJECT_ROOT, 'cache', 'jekyll-hyde-modernized.json');
    if (!fs.existsSync(modernizedPath)) {
      throw new Error('❌ Modernized text not found. Run modernize-jekyll-hyde.js first!');
    }

    const modernized = JSON.parse(fs.readFileSync(modernizedPath, 'utf8'));
    // Extract modernized text from chunks structure
    const fullText = modernized.chunks.map(c => c.modernizedText).join(' ');

    console.log(`📖 Book: ${modernized.title}`);
    console.log(`✍️ Author: ${modernized.author}`);
    console.log(`📝 Total words: ${fullText.split(/\s+/).length}`);

    // Check for existing cache (resume capability)
    let processedSentences = [];
    if (fs.existsSync(CACHE_FILE) && !this.clearCache) {
      const cached = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
      processedSentences = cached.sentences || [];
      console.log(`♻️ Resuming from sentence ${processedSentences.length}`);
    }

    // Split into sentences preserving punctuation, filtering out chapter titles
    const originalSentences = fullText
      .split(/(?<=[.!?])\s+/)
      .map(s => s.trim())
      .filter(s => s.length > 30) // Filter out short chapter titles
      .filter(s => !s.match(/^(CHAPTER|THE|DR\.|MR\.)[\s\w]+$/)); // Filter out title patterns

    console.log(`📊 Total sentences to process: ${originalSentences.length}`);
    console.log(`📦 Will create approximately ${Math.ceil(originalSentences.length / 4)} bundles`);

    // Process in batches
    const startIdx = processedSentences.length;
    const batches = this.createBatches(originalSentences.slice(startIdx), BATCH_SIZE);
    const batchesToProcess = this.isPilot ? batches.slice(0, this.maxBatches) : batches;

    console.log(`\n🔄 Processing ${batchesToProcess.length} batches...`);

    for (let i = 0; i < batchesToProcess.length; i++) {
      const batch = batchesToProcess[i];
      console.log(`\n📝 Batch ${i + 1}/${batchesToProcess.length} (${batch.length} sentences)`);

      try {
        const simplifiedBatch = await this.simplifyBatchToA2(batch);
        processedSentences.push(...simplifiedBatch);

        // Save progress after each batch (incremental saving)
        this.saveProgress(processedSentences);
        console.log(`✅ Batch ${i + 1} complete. Total processed: ${processedSentences.length}`);

        // Rate limiting
        if (i < batchesToProcess.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (error) {
        console.error(`❌ Failed to process batch ${i + 1}:`, error.message);

        if (error.message.includes('rate_limit')) {
          console.log('⏳ Rate limited, waiting 30 seconds...');
          await new Promise(resolve => setTimeout(resolve, 30000));
          i--; // Retry this batch
        }
      }
    }

    console.log('\n🎉 A2 Simplification complete!');
    console.log(`📊 Total sentences simplified: ${processedSentences.length}`);
    console.log(`📦 Total bundles: ${Math.ceil(processedSentences.length / 4)}`);

    // Store in database
    if (!this.isPilot || process.argv.includes('--save-to-db')) {
      await this.saveToDatabase(processedSentences);
    }

    console.log('\n✨ Next steps:');
    console.log('1. Run: node scripts/generate-jekyll-hyde-a2-audio.js --pilot');
    console.log('2. Test in Featured Books page');
    console.log('3. If good, run full generation without --pilot flag');
  }

  async simplifyBatchToA2(sentences) {
    const systemPrompt = `CRITICAL: Return ONLY a JSON array of exactly ${sentences.length} strings.
Format: ["sentence 1", "sentence 2", "sentence 3", ...]

Simplify classic literature for A2-level ESL learners with:
- Compound sentences of 11-13 words average
- Natural conjunctions: "and", "but", "so", "when", "while", "because"
- Proper punctuation: comma before conjunctions
- A2 vocabulary (1200-1500 most common words)`;

    const userPrompt = `Simplify these sentences to A2 level with natural compound structure:

${sentences.map((s, i) => `${i + 1}. ${s}`).join('\n')}

Return JSON array of ${sentences.length} simplified sentences.`;

    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      attempts++;

      try {
        const response = await openai.chat.completions.create({
          model: 'gpt-4-turbo-preview',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.3,
          max_tokens: 4000
        });

        const content = response.choices[0].message.content;
        const simplifiedArray = this.extractSentencesFromText(content);

        if (Array.isArray(simplifiedArray) && simplifiedArray.length === sentences.length) {
          // Validate sentence structure
          const validated = simplifiedArray.map(sentence => {
            const text = typeof sentence === 'string' ? sentence : sentence.text;
            const words = text.split(/\s+/).length;

            if (words < 8) {
              console.warn(`⚠️ Short sentence detected (${words} words): ${text.substring(0, 50)}...`);
            }

            return text;
          });

          return validated;
        }

        console.warn(`⚠️ Attempt ${attempts}: Got ${simplifiedArray ? simplifiedArray.length : 0} sentences, expected ${sentences.length}`);

      } catch (error) {
        console.error(`❌ Attempt ${attempts} failed:`, error.message);
      }
    }

    // Fallback: return original sentences if all attempts fail
    console.warn('⚠️ All attempts failed, using original sentences');
    return sentences;
  }

  extractSentencesFromText(responseText) {
    // Strategy 1: Try JSON parse
    try {
      const parsed = JSON.parse(responseText.trim());
      if (Array.isArray(parsed)) return parsed;
    } catch (e) {}

    // Strategy 2: Extract JSON from text
    const jsonMatch = responseText.match(/\[(.*?)\]/s);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch (e) {}
    }

    // Strategy 3: Split on sentence endings
    return responseText.split(/[.!?]+/).filter(s => s.length > 10);
  }

  createBatches(items, batchSize) {
    const batches = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  saveProgress(sentences) {
    const cacheData = {
      bookId: BOOK_ID,
      cefrLevel: CEFR_LEVEL,
      sentences: sentences,
      totalProcessed: sentences.length,
      lastUpdated: new Date().toISOString()
    };

    fs.writeFileSync(CACHE_FILE, JSON.stringify(cacheData, null, 2));
  }

  async saveToDatabase(sentences) {
    console.log('\n💾 Saving to database...');

    // Create book content record
    await prisma.bookContent.upsert({
      where: { bookId: `${BOOK_ID}-${CEFR_LEVEL}` },
      update: {
        fullText: sentences.join(' '),
        wordCount: sentences.join(' ').split(/\s+/).length,
        totalChunks: Math.ceil(sentences.length / 4)
      },
      create: {
        bookId: `${BOOK_ID}-${CEFR_LEVEL}`,
        title: 'Dr. Jekyll and Mr. Hyde (A2)',
        author: 'Robert Louis Stevenson',
        fullText: sentences.join(' '),
        wordCount: sentences.join(' ').split(/\s+/).length,
        totalChunks: Math.ceil(sentences.length / 4)
      }
    });

    // Create bundles (4 sentences each)
    const bundles = [];
    for (let i = 0; i < sentences.length; i += 4) {
      const bundleSentences = sentences.slice(i, i + 4);
      const bundleText = bundleSentences.join(' ');

      bundles.push({
        bookId: BOOK_ID,
        cefrLevel: CEFR_LEVEL,
        chunkIndex: Math.floor(i / 4),
        chunkText: bundleText,
        wordCount: bundleText.split(/\s+/).length,
        isSimplified: true
      });
    }

    // Upsert bundles to database
    for (const bundle of bundles) {
      await prisma.bookChunk.upsert({
        where: {
          bookId_cefrLevel_chunkIndex: {
            bookId: bundle.bookId,
            cefrLevel: bundle.cefrLevel,
            chunkIndex: bundle.chunkIndex
          }
        },
        update: bundle,
        create: bundle
      });
    }

    console.log(`✅ Saved ${bundles.length} bundles to database`);
  }
}

// Run the script
async function main() {
  try {
    const simplifier = new JekyllHydeA2Simplifier();
    await simplifier.simplifyToA2();
  } catch (error) {
    console.error('❌ Simplification failed:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();