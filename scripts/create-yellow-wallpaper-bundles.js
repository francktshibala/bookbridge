#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import OpenAI from 'openai';
import { PrismaClient } from '@prisma/client';

// Load environment variables
dotenv.config({ path: '.env.local' });

const prisma = new PrismaClient();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Configuration with absolute paths
const PROJECT_ROOT = path.resolve(process.cwd());
const CACHE_DIR = path.join(PROJECT_ROOT, 'cache');
const INPUT_FILE = path.join(CACHE_DIR, 'yellow-wallpaper-modernized.json');
const OUTPUT_FILE = path.join(CACHE_DIR, 'yellow-wallpaper-bundles.json');

// Book configuration
const BOOK_ID = 'gutenberg-1952';
const CEFR_LEVEL = 'A1';

async function createYellowWallpaperBundles() {
  try {
    console.log('📦 Creating Yellow Wallpaper bundles for Featured Books architecture...\n');

    // Load modernized text
    if (!fs.existsSync(INPUT_FILE)) {
      throw new Error('Modernized text not found. Run modernize script first.');
    }

    const modernizedData = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf-8'));
    console.log(`📖 Loaded modernized text from ${modernizedData.chunks.length} chunks`);

    // Combine all modernized chunks into full text
    const fullModernizedText = modernizedData.chunks
      .map(chunk => chunk.modernizedText)
      .join('\n\n');

    console.log(`📝 Combined text: ${fullModernizedText.split(/\s+/).length} words`);

    // Simplify to A1 and create bundles in one step
    const bundles = await createA1Bundles(fullModernizedText);

    // Save bundles data
    const bundleData = {
      bookId: BOOK_ID,
      title: 'The Yellow Wallpaper',
      author: 'Charlotte Perkins Gilman',
      cefrLevel: CEFR_LEVEL,
      totalBundles: bundles.length,
      bundles: bundles,
      createdAt: new Date().toISOString()
    };

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(bundleData, null, 2));
    console.log(`💾 Saved ${bundles.length} bundles to cache`);

    // Save to database
    await saveBundlesToDatabase(bundleData);

    console.log('\n🎉 Yellow Wallpaper bundles created successfully!');
    console.log(`📊 Total bundles: ${bundles.length}`);
    console.log(`📝 Average sentences per bundle: ${(bundles.reduce((sum, b) => sum + b.sentences.length, 0) / bundles.length).toFixed(1)}`);

    return bundleData;

  } catch (error) {
    console.error('❌ Error creating bundles:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

async function createA1Bundles(modernizedText) {
  console.log('\n🔄 Simplifying to A1 level and creating bundles...');

  const prompt = `SIMPLIFY THIS STORY TO A1 LEVEL AND CREATE BUNDLES:

TASK: Simplify "The Yellow Wallpaper" to A1 CEFR level and organize into 4-sentence bundles.

A1 REQUIREMENTS:
- Use only basic vocabulary (most common 1000 words)
- Simple present/past tense only
- Maximum 12 words per sentence
- Subject + Verb + Object structure

BUNDLE FORMAT:
- Each bundle = exactly 4 sentences
- Sentences should flow naturally together
- Maintain story progression

STORY TO SIMPLIFY:
${modernizedText}

OUTPUT FORMAT (JSON):
{
  "bundles": [
    {
      "bundleIndex": 0,
      "sentences": [
        "John and I live in a big old house for the summer.",
        "The house is very beautiful but something feels strange.",
        "John is a doctor and he says I am sick.",
        "He tells me I need to rest and not work."
      ]
    },
    {
      "bundleIndex": 1,
      "sentences": [
        "We sleep in a room at the top of the house.",
        "The room has yellow wallpaper that I don't like.",
        "The wallpaper has a strange pattern on it.",
        "I look at it every day and it makes me feel bad."
      ]
    }
  ]
}`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 4000,
      temperature: 0.2
    });

    const result = JSON.parse(response.choices[0].message.content.trim());
    return result.bundles.map((bundle, index) => ({
      bundleIndex: index,
      bundleId: `bundle_${index}`,
      sentences: bundle.sentences.map((text, sentenceIndex) => ({
        sentenceId: `${BOOK_ID}-${index}-${sentenceIndex}`,
        sentenceIndex: index * 4 + sentenceIndex,
        text: text,
        startTime: sentenceIndex * 2.5, // Estimated timing
        endTime: (sentenceIndex + 1) * 2.5,
        wordTimings: [] // Will be filled during audio generation
      }))
    }));

  } catch (error) {
    console.error('❌ A1 simplification error:', error);
    throw error;
  }
}

async function saveBundlesToDatabase(bundleData) {
  console.log('\n💾 Saving bundles to database...');

  try {
    // Upsert book record
    await prisma.book.upsert({
      where: { id: BOOK_ID },
      update: {
        title: bundleData.title,
        author: bundleData.author
      },
      create: {
        id: BOOK_ID,
        title: bundleData.title,
        author: bundleData.author,
        publishYear: 1892,
        genre: 'Short Story'
      }
    });

    // Upsert book content
    await prisma.bookContent.upsert({
      where: { bookId: BOOK_ID },
      update: {
        title: bundleData.title,
        author: bundleData.author,
        fullText: bundleData.bundles.map(b =>
          b.sentences.map(s => s.text).join(' ')
        ).join('\n\n')
      },
      create: {
        bookId: BOOK_ID,
        title: bundleData.title,
        author: bundleData.author,
        fullText: bundleData.bundles.map(b =>
          b.sentences.map(s => s.text).join(' ')
        ).join('\n\n')
      }
    });

    // Create book chunks (bundles) for each bundle
    for (const bundle of bundleData.bundles) {
      const chunkText = bundle.sentences.map(s => s.text).join(' ');

      await prisma.bookChunk.upsert({
        where: {
          bookId_chunkIndex_cefrLevel: {
            bookId: BOOK_ID,
            chunkIndex: bundle.bundleIndex,
            cefrLevel: CEFR_LEVEL
          }
        },
        update: {
          chunkText: chunkText,
          wordCount: chunkText.split(/\s+/).length
        },
        create: {
          bookId: BOOK_ID,
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
  createYellowWallpaperBundles().catch(console.error);
}

export { createYellowWallpaperBundles };