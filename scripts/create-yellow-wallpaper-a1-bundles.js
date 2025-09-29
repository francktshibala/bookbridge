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

// Configuration with absolute paths (prevent file path conflicts)
const PROJECT_ROOT = path.resolve(process.cwd());
const CACHE_DIR = path.join(PROJECT_ROOT, 'cache');
const INPUT_FILE = path.join(CACHE_DIR, 'yellow-wallpaper-modernized.json');
const OUTPUT_FILE = path.join(CACHE_DIR, 'yellow-wallpaper-a1-bundles.json');

// Book-specific IDs (prevent path conflicts)
const BOOK_ID = 'gutenberg-1952';
const SIMPLIFIED_BOOK_ID = 'gutenberg-1952-A1';
const CEFR_LEVEL = 'A1';

// CLI flags
const args = process.argv.slice(2);
const isPilot = args.includes('--pilot');
const clearCache = args.includes('--clear-cache');

async function createYellowWallpaperA1Bundles() {
  try {
    console.log(`📚 Creating Yellow Wallpaper A1 bundles ${isPilot ? '(PILOT MODE - 20 bundles)' : '(FULL)'}...\n`);

    // Clear cache if requested
    if (clearCache && fs.existsSync(OUTPUT_FILE)) {
      fs.unlinkSync(OUTPUT_FILE);
      console.log('🗑️ Cleared existing cache');
    }

    // Check for existing cache (resume capability)
    if (fs.existsSync(OUTPUT_FILE)) {
      console.log('💾 Found cached bundles, loading...');
      const cached = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf-8'));
      if (cached.completed || (isPilot && cached.bundles.length >= 20)) {
        console.log(`✅ Already complete: ${cached.bundles.length} bundles`);
        return cached;
      }
    }

    // Load modernized text from our cache (prevent path conflicts)
    if (!fs.existsSync(INPUT_FILE)) {
      throw new Error('Modernized text not found. Run modernize-yellow-wallpaper-fixed.js first.');
    }

    const modernizedData = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf-8'));
    console.log(`📖 Loaded ${modernizedData.chunks.length} modernized chunks`);

    // Combine modernized chunks into full text
    const fullText = modernizedData.chunks
      .map(chunk => chunk.modernizedText)
      .join('\n\n');

    console.log(`📝 Combined text: ${fullText.split(/\s+/).length} words`);

    // Split into sentences for processing
    const sentences = fullText
      .split(/(?<=[.!?])\s+/)
      .filter(s => s.trim().length > 0)
      .map(s => s.trim());

    console.log(`📝 Found ${sentences.length} sentences to simplify`);

    // Process in batches (stay under token limits)
    const batchSize = 40; // 40 sentences per batch
    const targetSentences = isPilot ? Math.min(80, sentences.length) : sentences.length; // 20 bundles = 80 sentences
    const simplifiedSentences = [];

    for (let i = 0; i < targetSentences; i += batchSize) {
      const batchEnd = Math.min(i + batchSize, targetSentences);
      const batch = sentences.slice(i, batchEnd);

      console.log(`\n🔄 Simplifying sentences ${i + 1}-${batchEnd} to A1 level...`);

      const simplifiedBatch = await simplifyBatchToA1(batch, i, targetSentences);
      simplifiedSentences.push(...simplifiedBatch);

      console.log(`✅ Completed batch ${Math.floor(i / batchSize) + 1}`);

      // Rate limiting
      if (batchEnd < targetSentences) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    // Create bundles (4 sentences each) with validation
    const bundles = [];
    for (let i = 0; i < simplifiedSentences.length; i += 4) {
      const bundleSentences = simplifiedSentences.slice(i, i + 4);

      if (bundleSentences.length === 4) { // Only create complete bundles
        // CRITICAL VALIDATION: Ensure exactly 4 sentences
        const bundleText = bundleSentences.join(' ');
        const sentenceCheck = bundleText.split(/(?<=[.!?])\s+/).filter(s => s.trim());

        if (sentenceCheck.length !== 4) {
          console.error(`❌ Bundle ${Math.floor(i / 4)} validation failed: ${sentenceCheck.length} sentences in combined text`);
          continue; // Skip this bundle
        }
        const bundle = {
          bundleIndex: Math.floor(i / 4),
          bundleId: `bundle_${Math.floor(i / 4)}`,
          sentences: bundleSentences.map((text, sentenceIndex) => ({
            sentenceId: `${SIMPLIFIED_BOOK_ID}-${Math.floor(i / 4)}-${sentenceIndex}`,
            sentenceIndex: i + sentenceIndex,
            text: text,
            startTime: sentenceIndex * 2.5,
            endTime: (sentenceIndex + 1) * 2.5,
            wordTimings: []
          }))
        };
        bundles.push(bundle);
      }
    }

    // Save bundle data
    const bundleData = {
      bookId: SIMPLIFIED_BOOK_ID,
      originalBookId: BOOK_ID,
      title: 'The Yellow Wallpaper (A1 Level)',
      author: 'Charlotte Perkins Gilman',
      cefrLevel: CEFR_LEVEL,
      totalBundles: bundles.length,
      bundles: bundles,
      completed: !isPilot, // Mark as complete if not pilot
      createdAt: new Date().toISOString()
    };

    // Save to cache
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(bundleData, null, 2));
    console.log(`\n💾 Saved ${bundles.length} bundles to cache`);

    // Save to database
    await saveBundlesToDatabase(bundleData);

    console.log(`\n🎉 Yellow Wallpaper A1 bundles created successfully!`);
    console.log(`📊 Total bundles: ${bundles.length}`);
    console.log(`📝 Total sentences: ${bundles.reduce((sum, b) => sum + b.sentences.length, 0)}`);

    if (isPilot) {
      console.log(`\n🧪 PILOT COMPLETE - Review quality, then run without --pilot flag for full generation`);
    }

    return bundleData;

  } catch (error) {
    console.error('❌ Error creating A1 bundles:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

async function simplifyBatchToA1(sentences, startIndex, totalSentences) {
  const prompt = `SIMPLIFY THESE SENTENCES TO A1 CEFR LEVEL:

Context: Sentences ${startIndex + 1}-${startIndex + sentences.length} of ${totalSentences} from "The Yellow Wallpaper"

A1 REQUIREMENTS:
- Use only basic vocabulary (most common 1000 words)
- Simple present/past tense only
- Maximum 12 words per sentence
- Subject + Verb + Object structure
- No complex grammar

VOCABULARY REPLACEMENTS:
- "mansion" → "big house"
- "physician" → "doctor"
- "nervous condition" → "feeling sick"
- "wallpaper pattern" → "yellow paper on walls"
- "depression" → "sad feelings"

SENTENCES TO SIMPLIFY:
${sentences.map((s, i) => `${startIndex + i + 1}. ${s}`).join('\n')}

CRITICAL: Return EXACTLY the same number of sentences as input.
If input has 40 sentences, output must have exactly 40 sentences.

RETURN AS JSON ARRAY:
["Simplified sentence 1.", "Simplified sentence 2.", "etc."]

EXAMPLE - if input has 3 sentences, output exactly 3:
["Simple sentence one.", "Simple sentence two.", "Simple sentence three."]`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 2000,
      temperature: 0.2
    });

    return JSON.parse(response.choices[0].message.content.trim());
  } catch (error) {
    console.error('❌ A1 simplification error:', error);
    throw error;
  }
}

async function saveBundlesToDatabase(bundleData) {
  console.log('\n💾 Saving bundles to database...');

  try {
    // Upsert book record with A1 ID
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
        publishYear: 1892,
        genre: 'Short Story'
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

    // Create book chunks (bundles) with book-specific paths
    for (const bundle of bundleData.bundles) {
      const chunkText = bundle.sentences.map(s => s.text).join(' ');

      await prisma.bookChunk.upsert({
        where: {
          bookId_cefrLevel_chunkIndex: {
            bookId: bundleData.bookId, // Use A1 book ID
            cefrLevel: CEFR_LEVEL,
            chunkIndex: bundle.bundleIndex
          }
        },
        update: {
          chunkText: chunkText,
          wordCount: chunkText.split(/\s+/).length
        },
        create: {
          bookId: bundleData.bookId, // Use A1 book ID
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
  createYellowWallpaperA1Bundles().catch(console.error);
}

export { createYellowWallpaperA1Bundles };