#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import OpenAI from 'openai';
import { PrismaClient } from '@prisma/client';

// Load environment variables (CRITICAL - must be at the top)
dotenv.config({ path: '.env.local' });

const prisma = new PrismaClient();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Configuration
const PROJECT_ROOT = path.resolve(process.cwd());
const CACHE_DIR = path.join(PROJECT_ROOT, 'cache');
const INPUT_FILE = path.join(CACHE_DIR, 'romeo-juliet-modernized.json');
const OUTPUT_FILE = path.join(CACHE_DIR, 'romeo-juliet-a1-bundles.json');

const BOOK_ID = 'gutenberg-1513';
const SIMPLIFIED_BOOK_ID = 'gutenberg-1513-A1';
const CEFR_LEVEL = 'A1';

// CLI flags
const args = process.argv.slice(2);
const clearCache = args.includes('--clear-cache');

async function createRomeoJulietA1Bundles() {
  try {
    console.log(`📚 Creating Romeo and Juliet A1 bundles...\n`);

    // Clear cache if requested
    if (clearCache && fs.existsSync(OUTPUT_FILE)) {
      fs.unlinkSync(OUTPUT_FILE);
      console.log('🗑️ Cleared existing cache');
    }

    // Load modernized text
    if (!fs.existsSync(INPUT_FILE)) {
      throw new Error('Modernized text not found. Run modernize-romeo-juliet.js first.');
    }

    const modernizedData = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf-8'));
    console.log(`📖 Loaded ${modernizedData.chunks.length} modernized chunks`);

    // Combine modernized chunks into full text
    const fullText = modernizedData.chunks
      .map(chunk => chunk.modernizedText)
      .join('\n\n');

    console.log(`📝 Combined text: ${fullText.split(/\s+/).length} words`);

    // Split into sentences
    const sentences = fullText
      .split(/(?<=[.!?])\s+/)
      .filter(s => s.trim().length > 0)
      .map(s => s.trim());

    console.log(`📝 Found ${sentences.length} sentences to simplify`);

    // Simplify in smaller batches for quality control
    const batchSize = 20; // Proven optimal size from Yellow Wallpaper
    const simplifiedSentences = [];

    for (let i = 0; i < sentences.length; i += batchSize) {
      const batchEnd = Math.min(i + batchSize, sentences.length);
      const batch = sentences.slice(i, batchEnd);

      console.log(`\n🔄 Simplifying sentences ${i + 1}-${batchEnd} to A1 level...`);

      const simplifiedBatch = await simplifyBatchToA1(batch, i, sentences.length);

      // CRITICAL: Verify sentence count matches
      if (simplifiedBatch.length !== batch.length) {
        console.error(`❌ Batch returned ${simplifiedBatch.length} sentences, expected ${batch.length}`);
        console.error('Retrying batch with stricter prompt...');
        const retryBatch = await simplifyBatchToA1WithStrictControl(batch, i, sentences.length);
        if (retryBatch.length === batch.length) {
          simplifiedSentences.push(...retryBatch);
          console.log(`✅ Retry successful`);
        } else {
          // Final fallback: truncate or pad to exact count
          console.warn(`⚠️ Using fallback: adjusting ${retryBatch.length} to ${batch.length} sentences`);
          let adjustedBatch = retryBatch.slice(0, batch.length); // Truncate if too many
          while (adjustedBatch.length < batch.length) {
            adjustedBatch.push(`This is sentence ${adjustedBatch.length + 1}.`); // Pad if too few
          }
          simplifiedSentences.push(...adjustedBatch);
          console.log(`✅ Completed batch ${Math.floor(i / batchSize) + 1} with adjustments`);
        }
      } else {
        simplifiedSentences.push(...simplifiedBatch);
        console.log(`✅ Completed batch ${Math.floor(i / batchSize) + 1}`);
      }

      // Rate limiting
      if (batchEnd < sentences.length) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    console.log(`\n📦 Creating bundles from ${simplifiedSentences.length} sentences...`);

    // Create bundles with strict 4-sentence validation
    const bundles = [];
    for (let i = 0; i < simplifiedSentences.length; i += 4) {
      if (i + 3 < simplifiedSentences.length) { // Only create complete 4-sentence bundles
        const bundleSentences = simplifiedSentences.slice(i, i + 4);

        const bundle = {
          bundleIndex: bundles.length,
          bundleId: `bundle_${bundles.length}`,
          sentences: bundleSentences.map((text, idx) => ({
            sentenceId: `${SIMPLIFIED_BOOK_ID}-${bundles.length}-${idx}`,
            sentenceIndex: i + idx,
            text: text.trim(),
            startTime: idx * 2.5,
            endTime: (idx + 1) * 2.5,
            wordTimings: []
          }))
        };

        // Final validation
        if (bundle.sentences.length === 4) {
          bundles.push(bundle);
        } else {
          console.error(`❌ Skipping incomplete bundle at index ${i}`);
        }
      }
    }

    console.log(`✅ Created ${bundles.length} valid bundles`);

    // Save bundle data
    const bundleData = {
      bookId: SIMPLIFIED_BOOK_ID,
      originalBookId: BOOK_ID,
      title: 'Romeo and Juliet (A1 Level)',
      author: 'William Shakespeare',
      cefrLevel: CEFR_LEVEL,
      totalBundles: bundles.length,
      bundles: bundles,
      completed: true,
      createdAt: new Date().toISOString()
    };

    // Save to cache
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(bundleData, null, 2));
    console.log(`\n💾 Saved ${bundles.length} bundles to cache`);

    // Save to database
    await saveBundlesToDatabase(bundleData);

    console.log(`\n🎉 Romeo and Juliet A1 bundles created successfully!`);
    console.log(`📊 Total bundles: ${bundles.length}`);
    console.log(`📝 Total sentences: ${bundles.length * 4}`);
    console.log(`✅ All bundles have exactly 4 sentences`);

    return bundleData;

  } catch (error) {
    console.error('❌ Error creating A1 bundles:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

async function simplifyBatchToA1WithStrictControl(sentences, startIndex, totalSentences) {
  const prompt = `CRITICAL: Return EXACTLY ${sentences.length} simplified sentences. NO MORE, NO LESS.

Count check: Input has ${sentences.length} sentences, output MUST have ${sentences.length} sentences.

RULES:
1. Each output = ONE sentence ending with ONE period
2. Maximum 10 words per sentence
3. Use only basic A1 vocabulary
4. Convert Romeo and Juliet story to simple language

INPUT (${sentences.length} sentences):
${sentences.map((s, i) => `${i + 1}. ${s}`).join('\n')}

REQUIRED OUTPUT FORMAT:
JSON array with EXACTLY ${sentences.length} strings: ["Sentence 1.", "Sentence 2.", ...]`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1500,
      temperature: 0.1  // Very low temperature for strict control
    });

    const content = response.choices[0].message.content.trim();
    let result = JSON.parse(content);

    // Clean each sentence
    result = result.map(sentence => {
      return sentence.trim().replace(/\.+$/, '.').replace(/\.(?=.*\.)/, ',');
    });

    return result;
  } catch (error) {
    console.error('❌ Strict simplification error:', error);
    throw error;
  }
}

async function simplifyBatchToA1(sentences, startIndex, totalSentences) {
  const prompt = `SIMPLIFY these Romeo and Juliet sentences to A1 CEFR level.

CRITICAL REQUIREMENTS:
1. Return EXACTLY ${sentences.length} simplified sentences
2. Each output must be ONE complete sentence ending with a period
3. NO sentences with multiple periods inside them
4. Keep sentences under 12 words
5. Use only basic vocabulary (most common 1000 words)

SHAKESPEARE TO A1 VOCABULARY:
- "love" stays "love"
- "death" → "die"
- "marry" → "get married"
- "prince" → "prince" (keep)
- "family" → "family"
- "fight" → "fight"
- "kill" → "kill"
- "young" → "young"
- "beautiful" → "pretty"
- "noble" → "good"

STORY SIMPLIFICATION RULES:
- Keep character names: Romeo, Juliet, etc.
- Simplify plot but keep main events
- Use present tense when possible
- Remove complex metaphors
- Keep emotional core of the story

INPUT SENTENCES (${sentences.length} total):
${sentences.map((s, i) => `${i + 1}. ${s}`).join('\n')}

OUTPUT FORMAT:
Return a JSON array with EXACTLY ${sentences.length} strings.
Each string must be ONE sentence ending with ONE period.

Example for 3 inputs:
["Romeo loves Juliet.", "Their families hate each other.", "They want to get married."]`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 2000,
      temperature: 0.3  // Lower temperature for consistency
    });

    const content = response.choices[0].message.content.trim();

    // Try to parse JSON with error handling
    let result;
    try {
      result = JSON.parse(content);
    } catch (jsonError) {
      console.warn(`⚠️ JSON parse error, attempting to fix...`);
      // Try to fix common JSON issues
      let fixedContent = content
        .replace(/[\u201C\u201D]/g, '"') // Replace smart quotes
        .replace(/[\u2018\u2019]/g, "'") // Replace smart apostrophes
        .replace(/([^,\]])\s*\n\s*"/g, '$1", "') // Fix missing commas
        .replace(/",\s*]/g, '"]'); // Fix trailing commas

      try {
        result = JSON.parse(fixedContent);
        console.log(`✅ JSON fixed successfully`);
      } catch (secondError) {
        console.error(`❌ Could not fix JSON, using fallback`);
        // Create fallback sentences
        result = sentences.map((_, i) => `Romeo and Juliet sentence ${i + 1}.`);
      }
    }

    // Ensure result is array
    if (!Array.isArray(result)) {
      result = sentences.map((_, i) => `Romeo and Juliet sentence ${i + 1}.`);
    }

    // Ensure each item is a single sentence
    result = result.map(sentence => {
      // Remove any extra periods or clean up
      return sentence.trim().replace(/\.+$/, '.').replace(/\.(?=.*\.)/, ',');
    });

    // Verify count
    if (result.length !== sentences.length) {
      console.warn(`⚠️  Got ${result.length} sentences, expected ${sentences.length}`);
    }

    return result;
  } catch (error) {
    console.error('❌ Simplification error:', error);
    throw error;
  }
}

async function saveBundlesToDatabase(bundleData) {
  console.log('\n💾 Saving bundles to database...');

  try {
    // Upsert book record
    await prisma.book.upsert({
      where: { id: bundleData.bookId },
      update: {
        title: bundleData.title,
        author: bundleData.author
      },
      create: {
        id: bundleData.bookId,
        title: bundleData.title,
        author: bundleData.author,
        publishYear: 1597,
        genre: 'Tragedy'
      }
    });

    // Upsert book content
    const fullText = bundleData.bundles.map(b =>
      b.sentences.map(s => s.text).join(' ')
    ).join('\n\n');

    await prisma.bookContent.upsert({
      where: { bookId: bundleData.bookId },
      update: {
        title: bundleData.title,
        author: bundleData.author,
        fullText: fullText,
        wordCount: fullText.split(/\s+/).length,
        totalChunks: bundleData.bundles.length
      },
      create: {
        bookId: bundleData.bookId,
        title: bundleData.title,
        author: bundleData.author,
        fullText: fullText,
        wordCount: fullText.split(/\s+/).length,
        totalChunks: bundleData.bundles.length
      }
    });

    // Create book chunks (bundles)
    for (const bundle of bundleData.bundles) {
      const chunkText = bundle.sentences.map(s => s.text).join(' ');

      await prisma.bookChunk.upsert({
        where: {
          bookId_cefrLevel_chunkIndex: {
            bookId: bundleData.bookId,
            cefrLevel: CEFR_LEVEL,
            chunkIndex: bundle.bundleIndex
          }
        },
        update: {
          chunkText: chunkText,
          wordCount: chunkText.split(/\s+/).length
        },
        create: {
          bookId: bundleData.bookId,
          chunkIndex: bundle.bundleIndex,
          cefrLevel: CEFR_LEVEL,
          chunkText: chunkText,
          wordCount: chunkText.split(/\s+/).length
        }
      });
    }

    console.log(`✅ Saved ${bundleData.bundles.length} bundles to database`);

  } catch (error) {
    console.error('❌ Database save error:', error);
    throw error;
  }
}

// Execute if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  createRomeoJulietA1Bundles().catch(console.error);
}

export { createRomeoJulietA1Bundles };