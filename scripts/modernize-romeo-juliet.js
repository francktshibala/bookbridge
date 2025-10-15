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
const INPUT_FILE = path.join(CACHE_DIR, 'romeo-juliet-original.json');
const OUTPUT_FILE = path.join(CACHE_DIR, 'romeo-juliet-modernized.json');

const BOOK_ID = 'gutenberg-1513';

async function modernizeRomeoJuliet() {
  try {
    console.log('📝 Modernizing Romeo and Juliet with chunking strategy...\n');

    // Load original text
    if (!fs.existsSync(INPUT_FILE)) {
      throw new Error('Original text not found. Run fetch-romeo-juliet.js first.');
    }

    const originalData = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf-8'));
    const fullText = originalData.chunks[0].originalText;

    console.log(`📖 Loaded original text (${fullText.split(/\s+/).length} words)`);

    // Create processing chunks (Shakespeare is complex, use smaller chunks)
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
      console.log(`\n🔄 Processing chunk ${i + 1}/${chunks.length} (~${Math.round(chunk.split(/\s+/).length * 1.3)} tokens)...`);

      const modernizedText = await modernizeShakespeareChunk(chunk, i, chunks.length);

      modernizedChunks.push({
        chunkIndex: i,
        originalText: chunk,
        modernizedText: modernizedText,
        wordCount: modernizedText.split(/\s+/).length
      });

      // Save progress after each chunk
      const progressData = {
        bookId: BOOK_ID,
        title: 'Romeo and Juliet (Modernized)',
        author: 'William Shakespeare',
        chunks: modernizedChunks,
        completed: i === chunks.length - 1,
        createdAt: new Date().toISOString()
      };

      fs.writeFileSync(OUTPUT_FILE, JSON.stringify(progressData, null, 2));
      console.log(`✅ Completed chunk ${i + 1}, saved progress`);

      // Rate limiting
      if (i < chunks.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    console.log(`\n🎉 Romeo and Juliet modernization completed!`);
    console.log(`📊 Processed ${chunks.length} chunks`);

    return JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf-8'));

  } catch (error) {
    console.error('❌ Error modernizing Romeo and Juliet:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

function createOptimalChunks(text) {
  // For Shakespeare, use smaller chunks due to complex language
  const maxWordsPerChunk = 800; // Smaller for complex Shakespeare text
  const sentences = text.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 0);

  const chunks = [];
  let currentChunk = '';
  let currentWordCount = 0;

  for (const sentence of sentences) {
    const sentenceWords = sentence.split(/\s+/).length;

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

async function modernizeShakespeareChunk(text, chunkIndex, totalChunks) {
  const prompt = `MODERNIZE this Shakespeare text from Romeo and Juliet for contemporary readers.

MODERNIZATION RULES:
1. Convert Elizabethan English to modern English
2. Replace archaic words: "thou/thee/thy" → "you/your", "hath" → "has", "'tis" → "it is"
3. Simplify complex sentence structures while preserving meaning
4. Update archaic expressions to modern equivalents
5. Keep the dramatic essence and emotional impact
6. Maintain character names and plot elements exactly
7. Convert verse to natural prose where appropriate

SHAKESPEARE VOCABULARY UPDATES:
- "doth" → "does"
- "hast" → "have"
- "art" → "are"
- "ere" → "before"
- "hence" → "away/from here"
- "whence" → "where"
- "wherefore" → "why"
- "prithee" → "please"
- "marry" (interjection) → "indeed/well"

EXAMPLE TRANSFORMATION:
Original: "But soft, what light through yonder window breaks? It is the east, and Juliet is the sun."
Modern: "Wait, what light is coming through that window? It's from the east, and Juliet is like the sun."

TEXT TO MODERNIZE (Chunk ${chunkIndex + 1}/${totalChunks}):
${text}

CRITICAL: Maintain the story flow and character development. This is for ESL learners who need accessible language while preserving Shakespeare's beautiful story.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 2500,
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
  modernizeRomeoJuliet().catch(console.error);
}

export { modernizeRomeoJuliet };