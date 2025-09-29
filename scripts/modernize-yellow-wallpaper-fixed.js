#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import OpenAI from 'openai';

// Load environment variables (CRITICAL - must be at the top)
dotenv.config({ path: '.env.local' });

// Yellow Wallpaper Configuration
const BOOK_ID = 'yellow-wallpaper';
const PROJECT_ROOT = path.resolve(process.cwd());
const CACHE_DIR = path.join(PROJECT_ROOT, 'cache');
const INPUT_FILE = path.join(CACHE_DIR, 'yellow-wallpaper-original.json');
const OUTPUT_FILE = path.join(CACHE_DIR, 'yellow-wallpaper-modernized.json');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function estimateTokens(text) {
  // Rough estimation: 1 token ≈ 0.75 words
  return Math.ceil(text.split(/\s+/).length / 0.75);
}

function createOptimalChunks(text) {
  // Target ~1200 words per chunk to stay under token limits
  const sentences = text.split(/(?<=[.!?])\s+/);
  const chunks = [];
  let currentChunk = '';
  let currentWordCount = 0;
  const targetWordsPerChunk = 1200;

  for (const sentence of sentences) {
    const sentenceWordCount = sentence.split(/\s+/).length;

    if (currentWordCount + sentenceWordCount > targetWordsPerChunk && currentChunk) {
      chunks.push(currentChunk.trim());
      currentChunk = sentence + ' ';
      currentWordCount = sentenceWordCount;
    } else {
      currentChunk += sentence + ' ';
      currentWordCount += sentenceWordCount;
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

async function modernizeChunk(text, chunkIndex, totalChunks) {
  const isFirst = chunkIndex === 0;
  const isLast = chunkIndex === totalChunks - 1;

  let contextNote = '';
  if (isFirst) contextNote = 'This is the BEGINNING of the story.';
  else if (isLast) contextNote = 'This is the END of the story.';
  else contextNote = `This is part ${chunkIndex + 1} of ${totalChunks} of the story.`;

  const prompt = `MODERNIZE THIS SECTION OF "THE YELLOW WALLPAPER" (1892):

${contextNote}

CRITICAL RULES:
- PRESERVE story meaning 100% - no plot changes
- Keep Victorian setting but modernize language for contemporary readers
- Maintain Charlotte Perkins Gilman's psychological horror style
- Keep all character names and dialogue exactly as written
- Update only archaic expressions, not the story content

SPECIFIC MODERNIZATIONS:
- "nervous depression" → "anxiety and depression"
- "hysterical tendency" → "emotional sensitivity"
- "phosphates or phosphites" → "supplements or medications"
- Modernize medical/social terminology while keeping period accuracy

TEXT TO MODERNIZE:
${text}

MODERNIZED VERSION:`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 2000,
      temperature: 0.3
    });

    return response.choices[0].message.content.trim();
  } catch (error) {
    console.error('❌ OpenAI API error:', error);
    throw error;
  }
}

async function modernizeYellowWallpaper() {
  try {
    console.log('📝 Modernizing The Yellow Wallpaper with chunking strategy...\n');

    // Load original text
    if (!fs.existsSync(INPUT_FILE)) {
      throw new Error(`Original text not found. Run fetch-yellow-wallpaper.js first.`);
    }

    const originalData = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf-8'));
    console.log(`📖 Loaded original text (${originalData.chunks[0].wordCount} words)`);

    // Split into smaller chunks for API processing
    const originalText = originalData.chunks[0].text;
    const textChunks = createOptimalChunks(originalText);
    console.log(`📦 Split into ${textChunks.length} processing chunks`);

    // Initialize modernized data
    const modernizedData = {
      bookId: BOOK_ID,
      title: 'The Yellow Wallpaper',
      author: 'Charlotte Perkins Gilman',
      totalChunks: textChunks.length,
      chunks: [],
      modernizedAt: new Date().toISOString()
    };

    // Process each chunk
    for (let i = 0; i < textChunks.length; i++) {
      const chunk = textChunks[i];
      const tokenEstimate = estimateTokens(chunk);
      console.log(`\n🔄 Processing chunk ${i + 1}/${textChunks.length} (~${tokenEstimate} tokens)...`);

      const modernizedText = await modernizeChunk(chunk, i, textChunks.length);

      const modernizedChunk = {
        chunkIndex: i,
        originalText: chunk,
        modernizedText: modernizedText,
        wordCount: modernizedText.split(/\s+/).length,
        tokenEstimate: tokenEstimate
      };

      modernizedData.chunks.push(modernizedChunk);

      // Save progress after each chunk
      fs.writeFileSync(OUTPUT_FILE, JSON.stringify(modernizedData, null, 2));
      console.log(`✅ Completed chunk ${i + 1}, saved progress`);

      // Rate limiting
      if (i < textChunks.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    console.log('\n🎉 Yellow Wallpaper modernization completed!');
    console.log(`📊 Processed ${modernizedData.chunks.length} chunks`);

    return modernizedData;

  } catch (error) {
    console.error('❌ Error modernizing Yellow Wallpaper:', error);
    throw error;
  }
}

// Execute if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  modernizeYellowWallpaper().catch(console.error);
}

export { modernizeYellowWallpaper };