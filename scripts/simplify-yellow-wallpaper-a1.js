#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import OpenAI from 'openai';

// Load environment variables (CRITICAL - must be at the top)
dotenv.config({ path: '.env.local' });

// Configuration with absolute paths (GPT-5 validated pattern)
const PROJECT_ROOT = path.resolve(process.cwd());
const CACHE_DIR = path.join(PROJECT_ROOT, 'cache');
const INPUT_FILE = path.join(CACHE_DIR, 'yellow-wallpaper-modernized.json');
const OUTPUT_FILE = path.join(CACHE_DIR, 'yellow-wallpaper-A1-simplified.json');

// Book-specific ID to prevent path conflicts (MANDATORY)
const BOOK_ID = 'gutenberg-1952'; // Original book ID
const SIMPLIFIED_BOOK_ID = 'gutenberg-1952-A1'; // A1 version ID

// CLI flags for control
const args = process.argv.slice(2);
const clearCache = args.includes('--clear-cache');
const freshRun = args.includes('--fresh');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function simplifyYellowWallpaperA1() {
  try {
    console.log('📝 Simplifying The Yellow Wallpaper to A1 CEFR level...\n');

    // Clear cache if requested
    if (clearCache && fs.existsSync(OUTPUT_FILE)) {
      fs.unlinkSync(OUTPUT_FILE);
      console.log('🗑️ Cleared existing A1 cache');
    }

    // Resume capability - check for existing cache
    let a1Data = {
      bookId: SIMPLIFIED_BOOK_ID,
      originalBookId: BOOK_ID,
      title: 'The Yellow Wallpaper (A1 Level)',
      author: 'Charlotte Perkins Gilman',
      cefrLevel: 'A1',
      totalChunks: 0,
      chunks: [],
      simplifiedAt: new Date().toISOString()
    };

    if (fs.existsSync(OUTPUT_FILE) && !freshRun) {
      console.log('📄 Found cached A1 content, checking progress...');
      const cached = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf-8'));

      if (cached.totalChunks && cached.chunks.length >= cached.totalChunks) {
        console.log(`✅ A1 simplification already complete: ${cached.chunks.length} chunks`);
        return cached;
      }

      // Resume from cache
      a1Data = cached;
      console.log(`🔄 Resuming from chunk ${cached.chunks.length + 1}/${cached.totalChunks}`);
    }

    // Load modernized text
    if (!fs.existsSync(INPUT_FILE)) {
      throw new Error(`Modernized text not found. Run modernize-yellow-wallpaper-fixed.js first.`);
    }

    const modernizedData = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf-8'));
    console.log(`📖 Loaded ${modernizedData.chunks.length} modernized chunks`);

    // Set total chunks if not set
    if (a1Data.totalChunks === 0) {
      a1Data.totalChunks = modernizedData.chunks.length;
    }

    // Process remaining chunks (resume capability)
    const startIndex = a1Data.chunks.length;
    for (let i = startIndex; i < modernizedData.chunks.length; i++) {
      const chunk = modernizedData.chunks[i];
      console.log(`\n🔄 Simplifying chunk ${i + 1}/${modernizedData.chunks.length} to A1 level...`);

      const simplifiedText = await simplifyChunkToA1(chunk.modernizedText, i, modernizedData.chunks.length);

      const a1Chunk = {
        chunkIndex: i,
        modernizedText: chunk.modernizedText,
        a1Text: simplifiedText,
        wordCount: simplifiedText.split(/\s+/).length,
        simplifiedAt: new Date().toISOString()
      };

      a1Data.chunks.push(a1Chunk);

      // Save progress after each chunk (prevent data loss)
      fs.writeFileSync(OUTPUT_FILE, JSON.stringify(a1Data, null, 2));
      console.log(`✅ Completed A1 chunk ${i + 1}, saved progress`);

      // Rate limiting - plan for rate limits (GPT-5 validated)
      if (i < modernizedData.chunks.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    console.log('\n🎉 A1 simplification completed successfully!');
    console.log(`📊 Processed ${a1Data.chunks.length} chunks`);
    console.log(`💾 Cache saved to: ${OUTPUT_FILE}`);

    return a1Data;

  } catch (error) {
    console.error('❌ Error simplifying to A1:', error);
    console.log('\n⚠️  Progress saved - you can resume with the same command');
    throw error;
  }
}

async function simplifyChunkToA1(text, chunkIndex, totalChunks) {
  const isFirst = chunkIndex === 0;
  const isLast = chunkIndex === totalChunks - 1;

  let contextNote = '';
  if (isFirst) contextNote = 'This is the BEGINNING of "The Yellow Wallpaper" story.';
  else if (isLast) contextNote = 'This is the END of "The Yellow Wallpaper" story.';
  else contextNote = `This is part ${chunkIndex + 1} of ${totalChunks} of "The Yellow Wallpaper" story.`;

  const prompt = `SIMPLIFY THIS TEXT TO A1 CEFR LEVEL (Elementary English):

${contextNote}

CRITICAL A1 REQUIREMENTS:
- Use only simple present, past, and future tenses
- Maximum 15 words per sentence
- Use basic vocabulary (most common 1000 English words)
- Simple sentence structure: Subject + Verb + Object
- No complex grammar (no conditionals, subjunctive, etc.)
- Maintain the story's psychological horror but make it accessible

VOCABULARY SIMPLIFICATION:
- "mansion" → "big house"
- "physician" → "doctor"
- "depression/anxiety" → "sad and worried"
- "nervous condition" → "feeling sick"
- "wallpaper pattern" → "yellow paper on walls"
- "nursery" → "baby's room"

SENTENCE STRUCTURE:
- Break long sentences into short ones
- Use simple connecting words: and, but, so, because
- Remove complex descriptions, keep essential meaning
- Use simple past tense for story events

PRESERVE THESE KEY ELEMENTS:
- Woman is sick and staying in a big house
- She doesn't like the yellow wallpaper
- The wallpaper seems to move and have patterns
- She becomes obsessed with the wallpaper
- The psychological progression and ending

TEXT TO SIMPLIFY TO A1:
${text}

A1 SIMPLIFIED VERSION:`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 2000,
      temperature: 0.2
    });

    return response.choices[0].message.content.trim();
  } catch (error) {
    console.error('❌ OpenAI API error:', error);
    throw error;
  }
}

// Execute if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  simplifyYellowWallpaperA1().catch(console.error);
}

export { simplifyYellowWallpaperA1 };