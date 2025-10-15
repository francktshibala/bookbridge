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

// Configuration
const PROJECT_ROOT = path.resolve(process.cwd());
const CACHE_DIR = path.join(PROJECT_ROOT, 'cache');
const INPUT_FILE = path.join(CACHE_DIR, 'yellow-wallpaper-modernized.json');
const OUTPUT_FILE = path.join(CACHE_DIR, 'yellow-wallpaper-bundles.json');

const BOOK_ID = 'gutenberg-1952';
const CEFR_LEVEL = 'A1';

async function createYellowWallpaperBundles() {
  try {
    console.log('📦 Creating Yellow Wallpaper bundles with chunked processing...\n');

    // Load modernized text
    if (!fs.existsSync(INPUT_FILE)) {
      throw new Error('Modernized text not found. Run modernize script first.');
    }

    const modernizedData = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf-8'));
    console.log(`📖 Loaded ${modernizedData.chunks.length} modernized chunks`);

    let allBundles = [];
    let globalBundleIndex = 0;

    // Process each modernized chunk separately to stay within token limits
    for (let i = 0; i < modernizedData.chunks.length; i++) {
      const chunk = modernizedData.chunks[i];
      console.log(`\n🔄 Processing chunk ${i + 1}/${modernizedData.chunks.length}...`);

      const chunkBundles = await createA1BundlesFromChunk(
        chunk.modernizedText,
        globalBundleIndex,
        i,
        modernizedData.chunks.length
      );

      allBundles = allBundles.concat(chunkBundles);
      globalBundleIndex += chunkBundles.length;

      console.log(`✅ Created ${chunkBundles.length} bundles from chunk ${i + 1}`);

      // Rate limiting
      if (i < modernizedData.chunks.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    // Renumber sentences globally
    let globalSentenceIndex = 0;
    allBundles.forEach(bundle => {
      bundle.sentences.forEach(sentence => {
        sentence.sentenceIndex = globalSentenceIndex++;
        sentence.sentenceId = `${BOOK_ID}-${Math.floor(globalSentenceIndex / 4)}-${globalSentenceIndex % 4}`;
      });
    });

    // Save bundles data
    const bundleData = {
      bookId: BOOK_ID,
      title: 'The Yellow Wallpaper',
      author: 'Charlotte Perkins Gilman',
      cefrLevel: CEFR_LEVEL,
      totalBundles: allBundles.length,
      bundles: allBundles,
      createdAt: new Date().toISOString()
    };

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(bundleData, null, 2));
    console.log(`\n💾 Saved ${allBundles.length} bundles to cache`);

    // Save to database
    await saveBundlesToDatabase(bundleData);

    console.log('\n🎉 Yellow Wallpaper bundles created successfully!');
    console.log(`📊 Total bundles: ${allBundles.length}`);
    console.log(`📝 Total sentences: ${allBundles.reduce((sum, b) => sum + b.sentences.length, 0)}`);

    return bundleData;

  } catch (error) {
    console.error('❌ Error creating bundles:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

async function createA1BundlesFromChunk(chunkText, startBundleIndex, chunkIndex, totalChunks) {
  const isFirst = chunkIndex === 0;
  const isLast = chunkIndex === totalChunks - 1;

  let contextNote = '';
  if (isFirst) contextNote = 'This is the BEGINNING of "The Yellow Wallpaper" story.';
  else if (isLast) contextNote = 'This is the END of "The Yellow Wallpaper" story.';
  else contextNote = `This is part ${chunkIndex + 1} of ${totalChunks} of "The Yellow Wallpaper" story.`;

  const prompt = `SIMPLIFY TO A1 LEVEL AND CREATE BUNDLES:

${contextNote}

TASK: Simplify this text to A1 CEFR level and organize into 4-sentence bundles.

A1 REQUIREMENTS:
- Use only basic vocabulary (most common 1000 words)
- Simple present/past tense only
- Maximum 12 words per sentence
- Subject + Verb + Object structure

BUNDLE RULES:
- Each bundle = exactly 4 sentences
- Sentences should flow naturally together
- Maintain story progression

TEXT TO SIMPLIFY:
${chunkText}

OUTPUT AS JSON ARRAY:
[
  [
    "First sentence of bundle 1.",
    "Second sentence of bundle 1.",
    "Third sentence of bundle 1.",
    "Fourth sentence of bundle 1."
  ],
  [
    "First sentence of bundle 2.",
    "Second sentence of bundle 2.",
    "Third sentence of bundle 2.",
    "Fourth sentence of bundle 2."
  ]
]`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 2000,
      temperature: 0.2
    });

    const sentenceBundles = JSON.parse(response.choices[0].message.content.trim());

    return sentenceBundles.map((sentences, bundleOffset) => ({
      bundleIndex: startBundleIndex + bundleOffset,
      bundleId: `bundle_${startBundleIndex + bundleOffset}`,
      sentences: sentences.map((text, sentenceIndex) => ({
        sentenceId: `temp-${startBundleIndex + bundleOffset}-${sentenceIndex}`, // Will be renumbered
        sentenceIndex: 0, // Will be renumbered globally
        text: text,
        startTime: sentenceIndex * 2.5,
        endTime: (sentenceIndex + 1) * 2.5,
        wordTimings: []
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

    // Create book chunks (bundles)
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