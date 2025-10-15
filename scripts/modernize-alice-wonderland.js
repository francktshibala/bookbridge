#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import OpenAI from 'openai';

// Load environment variables
dotenv.config({ path: '.env.local' });

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Configuration
const PROJECT_ROOT = path.resolve(process.cwd());
const CACHE_DIR = path.join(PROJECT_ROOT, 'cache');
const INPUT_FILE = path.join(CACHE_DIR, 'alice-wonderland-original.json');
const OUTPUT_FILE = path.join(CACHE_DIR, 'alice-wonderland-modernized.json');

const BOOK_ID = 'gutenberg-11';

// CLI flags
const args = process.argv.slice(2);
const clearCache = args.includes('--clear-cache');
const freshRun = args.includes('--fresh');

async function modernizeAliceWonderland() {
  try {
    console.log('🔄 Modernizing Alice\'s Adventures in Wonderland...\n');

    // Clear cache if requested
    if (clearCache && fs.existsSync(OUTPUT_FILE)) {
      fs.unlinkSync(OUTPUT_FILE);
      console.log('🗑️ Cleared existing cache');
    }

    // Check for existing cache
    if (fs.existsSync(OUTPUT_FILE) && !freshRun) {
      const cached = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf-8'));
      if (cached.completed && cached.chunks && cached.chunks.length > 0) {
        console.log('✅ Found complete cached modernization');
        console.log(`📊 ${cached.chunks.length} chunks already processed`);
        return cached;
      }
    }

    // Load original text
    if (!fs.existsSync(INPUT_FILE)) {
      throw new Error('Original text not found. Run fetch-alice-wonderland.js first.');
    }

    const originalData = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf-8'));
    const fullText = originalData.fullText;

    console.log(`📖 Loaded original text (${fullText.split(/\\s+/).length} words)`);

    // Alice in Wonderland needs minimal modernization since Lewis Carroll's language
    // is already quite accessible compared to Shakespeare or older Victorian texts
    const chunks = createOptimalChunks(fullText);
    console.log(`📦 Split into ${chunks.length} processing chunks`);

    // Check for existing progress
    let modernizedChunks = [];
    if (fs.existsSync(OUTPUT_FILE)) {
      const existingData = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf-8'));
      modernizedChunks = existingData.chunks || [];
      console.log(`📄 Resuming from ${modernizedChunks.length} completed chunks`);
    }

    // Process each chunk
    for (let i = modernizedChunks.length; i < chunks.length; i++) {
      const chunk = chunks[i];
      console.log(`\\n🔄 Processing chunk ${i + 1}/${chunks.length} (~${Math.round(chunk.split(/\\s+/).length * 1.3)} tokens)...`);

      const modernizedText = await modernizeAliceChunk(chunk, i, chunks.length);

      modernizedChunks.push({
        chunkIndex: i,
        originalText: chunk,
        modernizedText: modernizedText,
        wordCount: modernizedText.split(/\\s+/).length
      });

      // Save progress after each chunk
      const progressData = {
        bookId: BOOK_ID,
        title: "Alice's Adventures in Wonderland (Modernized)",
        author: 'Lewis Carroll',
        chunks: modernizedChunks,
        completed: i === chunks.length - 1,
        createdAt: new Date().toISOString()
      };

      fs.writeFileSync(OUTPUT_FILE, JSON.stringify(progressData, null, 2));
      console.log(`✅ Completed chunk ${i + 1}, saved progress`);

      // Rate limiting
      if (i < chunks.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
    }

    console.log(`\\n🎉 Alice in Wonderland modernization completed!`);
    console.log(`📊 Processed ${chunks.length} chunks`);

    return JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf-8'));

  } catch (error) {
    console.error('❌ Error modernizing Alice in Wonderland:', error);
    throw error;
  }
}

function createOptimalChunks(text) {
  // Very small chunks to avoid token limits - Alice is huge
  const maxWordsPerChunk = 300;
  const sentences = text.split(/(?<=[.!?])\\s+/).filter(s => s.trim().length > 0);

  const chunks = [];
  let currentChunk = '';
  let currentWordCount = 0;

  for (const sentence of sentences) {
    const sentenceWords = sentence.split(/\\s+/).length;

    if (currentWordCount + sentenceWords > maxWordsPerChunk && currentChunk) {
      chunks.push(currentChunk.trim());
      currentChunk = sentence;
      currentWordCount = sentenceWords;
    } else {
      currentChunk += (currentChunk ? ' ' : '') + sentence;
      currentWordCount += sentenceWords;
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

async function modernizeAliceChunk(text, chunkIndex, totalChunks) {
  const prompt = `MINIMAL MODERNIZE this Lewis Carroll text from Alice's Adventures in Wonderland for contemporary readers.

LIGHT MODERNIZATION RULES:
1. Alice in Wonderland is already quite accessible - make minimal changes
2. Update only the most archaic Victorian expressions
3. Preserve Lewis Carroll's whimsical style and wordplay
4. Keep all character names and nonsense words exactly (Cheshire Cat, Mad Hatter, etc.)
5. Maintain the dreamlike, fantastical quality
6. Convert only obvious Victorian formalities to modern equivalents

SPECIFIC UPDATES NEEDED:
- "amongst" → "among"
- "whilst" → "while"
- "upon" → "on" (where natural)
- Overly formal Victorian dialogue → slightly more natural speech
- "presently" (meaning "soon") → "soon" or "in a moment"
- Very formal "you are" contractions → "you're" where appropriate

PRESERVE COMPLETELY:
- All nonsense words and Carroll's invented language
- Whimsical expressions and wordplay
- Character speech patterns (Mad Hatter's riddles, etc.)
- Fantastical descriptions and imagery
- The overall Victorian children's story charm

EXAMPLE TRANSFORMATION:
Original: "Presently she began thinking over other children she knew, who might do very well as pigs, and was just saying to herself, 'if one only knew the right way to change them—' when she was a little startled by seeing the Cheshire Cat sitting on a bough of a tree a few yards off."
Modern: "Soon she began thinking about other children she knew, who might do very well as pigs, and was just saying to herself, 'if one only knew the right way to change them—' when she was a little startled by seeing the Cheshire Cat sitting on a branch of a tree a few yards away."

TEXT TO MODERNIZE (Chunk ${chunkIndex + 1}/${totalChunks}):
${text}

CRITICAL: Keep Alice's wonder and Carroll's magical language intact. This is gentle modernization for ESL accessibility while preserving the classic children's story magic.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 3000,
      temperature: 0.3
    });

    return response.choices[0].message.content.trim();
  } catch (error) {
    console.error('❌ Modernization error:', error);
    throw error;
  }
}

// Execute if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  modernizeAliceWonderland().catch(console.error);
}

export { modernizeAliceWonderland };