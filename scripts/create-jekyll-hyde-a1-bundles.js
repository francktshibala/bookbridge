#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import OpenAI from 'openai';
import { PrismaClient } from '@prisma/client';

// Load environment variables
dotenv.config({ path: '.env.local' });

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const prisma = new PrismaClient();

// Configuration
const PROJECT_ROOT = path.resolve(process.cwd());
const CACHE_DIR = path.join(PROJECT_ROOT, 'cache');
const INPUT_FILE = path.join(CACHE_DIR, 'jekyll-hyde-modernized.json');
const OUTPUT_FILE = path.join(CACHE_DIR, 'jekyll-hyde-a1-bundles.json');

const BOOK_ID = 'gutenberg-43-A1';

// CLI flags
const args = process.argv.slice(2);
const clearCache = args.includes('--clear-cache');
const freshRun = args.includes('--fresh');

async function createJekyllHydeA1Bundles() {
  try {
    console.log('🔄 Creating Jekyll & Hyde A1 bundles...\n');

    // Clear cache if requested
    if (clearCache && fs.existsSync(OUTPUT_FILE)) {
      fs.unlinkSync(OUTPUT_FILE);
      console.log('🗑️ Cleared existing cache');
    }

    // Check for existing cache
    if (fs.existsSync(OUTPUT_FILE) && !freshRun) {
      const cached = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf-8'));
      if (cached.completed && cached.bundles && cached.bundles.length > 0) {
        console.log('✅ Found complete cached A1 bundles');
        console.log(`📊 ${cached.bundles.length} bundles already processed`);
        await saveToDatabase(cached.bundles);
        return cached;
      }
    }

    // Load modernized text
    if (!fs.existsSync(INPUT_FILE)) {
      throw new Error('Modernized text not found. Run modernize-jekyll-hyde.js first.');
    }

    const modernizedData = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf-8'));
    const modernizedText = modernizedData.chunks.map(c => c.modernizedText).join(' ');

    console.log(`📖 Loaded modernized text (${modernizedText.split(/\s+/).length} words)`);

    // Split into sentences
    const sentences = modernizedText
      .split(/(?<=[.!?])\s+/)
      .filter(s => s.trim().length > 0)
      .map(s => s.trim());

    console.log(`📝 Found ${sentences.length} sentences`);

    // Group into 4-sentence bundles
    const bundles = [];
    for (let i = 0; i < sentences.length; i += 4) {
      const bundleSentences = sentences.slice(i, i + 4);
      bundles.push({
        bundleId: bundles.length + 1,
        originalSentences: bundleSentences,
        sentenceCount: bundleSentences.length
      });
    }

    console.log(`📦 Created ${bundles.length} bundles (4 sentences each)`);

    // Check for existing progress
    let simplifiedBundles = [];
    if (fs.existsSync(OUTPUT_FILE)) {
      const existingData = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf-8'));
      simplifiedBundles = existingData.bundles || [];
      console.log(`📄 Resuming from ${simplifiedBundles.length} completed bundles`);
    }

    // Process bundles in batches of 20
    const batchSize = 20;
    for (let batchStart = simplifiedBundles.length; batchStart < bundles.length; batchStart += batchSize) {
      const batchEnd = Math.min(batchStart + batchSize, bundles.length);
      const batch = bundles.slice(batchStart, batchEnd);
      const batchNumber = Math.floor(batchStart / batchSize) + 1;
      const totalBatches = Math.ceil(bundles.length / batchSize);

      console.log(`\n🔄 Processing batch ${batchNumber}/${totalBatches} (bundles ${batchStart + 1}-${batchEnd})...`);

      let simplifiedBatch;
      try {
        simplifiedBatch = await simplifyBatchToA1(batch, batchStart, bundles.length);

        // Validate batch integrity
        if (simplifiedBatch.length !== batch.length) {
          console.log(`⚠️ Batch ${batchNumber} returned ${simplifiedBatch.length} bundles instead of ${batch.length}, using strict control...`);
          const retryBatch = await simplifyBatchToA1WithStrictControl(batch, batchStart, bundles.length);

          if (retryBatch.length === batch.length) {
            simplifiedBundles.push(...retryBatch);
          } else {
            // Fallback: pad or truncate to exact count
            const correctedBatch = batch.map((originalBundle, idx) => ({
              ...originalBundle,
              simplifiedSentences: retryBatch[idx]?.simplifiedSentences || originalBundle.originalSentences,
              wordCount: retryBatch[idx]?.wordCount || originalBundle.originalSentences.join(' ').split(/\s+/).length
            }));
            simplifiedBundles.push(...correctedBatch);
          }
        } else {
          simplifiedBundles.push(...simplifiedBatch);
        }
      } catch (batchError) {
        console.log(`⚠️ Batch ${batchNumber} failed with error: ${batchError.message}, using strict control...`);
        try {
          const retryBatch = await simplifyBatchToA1WithStrictControl(batch, batchStart, bundles.length);
          simplifiedBundles.push(...retryBatch);
        } catch (retryError) {
          console.log(`⚠️ Strict control also failed, using fallback...`);
          // Ultimate fallback: use original sentences
          const fallbackBatch = batch.map(originalBundle => ({
            ...originalBundle,
            simplifiedSentences: originalBundle.originalSentences,
            wordCount: originalBundle.originalSentences.join(' ').split(/\s+/).length
          }));
          simplifiedBundles.push(...fallbackBatch);
        }
      }

      // Save progress after each batch
      const progressData = {
        bookId: BOOK_ID,
        title: "The Strange Case of Dr. Jekyll and Mr. Hyde (A1 Level)",
        author: 'Robert Louis Stevenson',
        bundles: simplifiedBundles,
        completed: batchEnd >= bundles.length,
        createdAt: new Date().toISOString()
      };

      fs.writeFileSync(OUTPUT_FILE, JSON.stringify(progressData, null, 2));
      console.log(`✅ Completed batch ${batchNumber}, saved progress (${simplifiedBundles.length}/${bundles.length} bundles)`);

      // Rate limiting
      if (batchEnd < bundles.length) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    console.log(`\n🎉 Jekyll & Hyde A1 simplification completed!`);
    console.log(`📊 Processed ${bundles.length} bundles`);

    // Save to database
    await saveToDatabase(simplifiedBundles);

    return JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf-8'));

  } catch (error) {
    console.error('❌ Error creating Jekyll & Hyde A1 bundles:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

async function simplifyBatchToA1(bundles, startIndex, total) {
  const prompt = `SIMPLIFY these Jekyll & Hyde text bundles to CEFR A1 level for ESL learners.

A1 LEVEL REQUIREMENTS:
- Use only 1000 most common English words
- Maximum 10 words per sentence
- Present simple tense primarily
- Very basic vocabulary only
- Clear, direct sentences
- Remove complex ideas, keep main story

BUNDLE FORMAT: Each bundle has exactly 4 sentences. Return exactly ${bundles.length} bundles.

VOCABULARY EXAMPLES:
- transformation → change
- laboratory → room where he works
- experiment → test
- frightening → scary
- mysterious → strange
- personality → the way someone is

SIMPLIFICATION EXAMPLE:
Original: "Mr. Utterson was a lawyer of a rugged countenance that was never lighted by a smile; cold, scanty and embarrassed in discourse; backward in sentiment; lean, long, dusty, dreary and yet somehow loveable."
A1: "Mr. Utterson was a lawyer. He never smiled. He did not talk much. People liked him."

BUNDLES TO SIMPLIFY (${startIndex + 1}-${Math.min(startIndex + bundles.length, total)} of ${total}):
${bundles.map((bundle, i) => `Bundle ${bundle.bundleId}:\n${bundle.originalSentences.join(' ')}`).join('\n\n')}

Return EXACTLY ${bundles.length} simplified bundles in this JSON format:
[
  {
    "bundleId": 1,
    "simplifiedSentences": ["sentence1", "sentence2", "sentence3", "sentence4"]
  }
]

CRITICAL: Return exactly ${bundles.length} bundles with exactly 4 sentences each.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 4000,
      temperature: 0.2
    });

    let content = response.choices[0].message.content.trim();

    // Clean JSON response with enhanced error handling
    content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    content = content.replace(/[""]/g, '"').replace(/['']/g, "'");

    // Additional cleaning for malformed JSON
    content = content.replace(/,(\s*[}\]])/g, '$1'); // Remove trailing commas
    content = content.replace(/([}\]]),?(\s*$)/g, '$1$2'); // Clean final trailing comma

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (jsonError) {
      console.log(`⚠️ JSON parse failed, attempting repair...`);
      // Try to extract valid JSON array
      const arrayMatch = content.match(/\[\s*{[\s\S]*}\s*\]/);
      if (arrayMatch) {
        parsed = JSON.parse(arrayMatch[0]);
      } else {
        throw new Error(`JSON parsing failed: ${jsonError.message}`);
      }
    }

    return parsed.map(bundle => ({
      bundleId: bundle.bundleId,
      originalSentences: bundles.find(b => b.bundleId === bundle.bundleId)?.originalSentences || [],
      simplifiedSentences: bundle.simplifiedSentences,
      wordCount: bundle.simplifiedSentences.join(' ').split(/\s+/).length
    }));

  } catch (error) {
    console.error('❌ Batch simplification error:', error);
    throw error;
  }
}

async function simplifyBatchToA1WithStrictControl(bundles, startIndex, total) {
  const prompt = `SIMPLIFY these Jekyll & Hyde bundles to A1 level. RETURN EXACTLY ${bundles.length} BUNDLES.

STRICT A1 RULES:
- Only 1000 most common words
- Max 8 words per sentence
- Simple sentences only
- Present tense mainly
- Basic vocabulary

BUNDLES (${startIndex + 1}-${Math.min(startIndex + bundles.length, total)} of ${total}):
${bundles.map((bundle, i) => `${bundle.bundleId}: ${bundle.originalSentences.join(' ')}`).join('\n')}

JSON FORMAT - EXACTLY ${bundles.length} BUNDLES:
[{"bundleId": ${bundles[0].bundleId}, "simplifiedSentences": ["sent1", "sent2", "sent3", "sent4"]}${bundles.length > 1 ? `, {"bundleId": ${bundles[1].bundleId}, "simplifiedSentences": ["sent1", "sent2", "sent3", "sent4"]}` : ''}]`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 4000,
      temperature: 0.1
    });

    let content = response.choices[0].message.content.trim();
    content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    content = content.replace(/[""]/g, '"').replace(/['']/g, "'");

    // Additional cleaning for malformed JSON
    content = content.replace(/,(\s*[}\]])/g, '$1'); // Remove trailing commas
    content = content.replace(/([}\]]),?(\s*$)/g, '$1$2'); // Clean final trailing comma

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (jsonError) {
      console.log(`⚠️ JSON parse failed, attempting repair...`);
      // Try to extract valid JSON array
      const arrayMatch = content.match(/\[\s*{[\s\S]*}\s*\]/);
      if (arrayMatch) {
        parsed = JSON.parse(arrayMatch[0]);
      } else {
        throw new Error(`JSON parsing failed: ${jsonError.message}`);
      }
    }

    return parsed.map(bundle => ({
      bundleId: bundle.bundleId,
      originalSentences: bundles.find(b => b.bundleId === bundle.bundleId)?.originalSentences || [],
      simplifiedSentences: bundle.simplifiedSentences,
      wordCount: bundle.simplifiedSentences.join(' ').split(/\s+/).length
    }));

  } catch (error) {
    console.error('❌ Strict control error:', error);
    return bundles.map(bundle => ({
      bundleId: bundle.bundleId,
      originalSentences: bundle.originalSentences,
      simplifiedSentences: bundle.originalSentences,
      wordCount: bundle.originalSentences.join(' ').split(/\s+/).length
    }));
  }
}

async function saveToDatabase(bundles) {
  console.log('\n💾 Saving to database...');

  try {
    // Create/update Book record
    await prisma.book.upsert({
      where: { id: BOOK_ID },
      update: {
        title: "The Strange Case of Dr. Jekyll and Mr. Hyde (A1 Level)",
        author: 'Robert Louis Stevenson'
      },
      create: {
        id: BOOK_ID,
        title: "The Strange Case of Dr. Jekyll and Mr. Hyde (A1 Level)",
        author: 'Robert Louis Stevenson',
        publishYear: 1886,
        genre: 'Gothic Horror (Simplified)'
      }
    });

    // Delete existing chunks
    await prisma.bookChunk.deleteMany({
      where: { bookId: BOOK_ID }
    });

    // Create chunks from bundles
    for (const bundle of bundles) {
      await prisma.bookChunk.create({
        data: {
          bookId: BOOK_ID,
          chunkIndex: bundle.bundleId - 1,
          chunkText: bundle.simplifiedSentences.join(' '),
          wordCount: bundle.wordCount,
          cefrLevel: 'A1'
        }
      });
    }

    console.log(`✅ Saved ${bundles.length} bundles to database`);

  } catch (error) {
    console.error('❌ Database save error:', error);
    throw error;
  }
}

// Execute if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  createJekyllHydeA1Bundles().catch(console.error);
}

export { createJekyllHydeA1Bundles };