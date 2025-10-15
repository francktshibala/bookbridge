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
const INPUT_FILE = path.join(CACHE_DIR, 'jekyll-hyde-original.json');
const OUTPUT_FILE = path.join(CACHE_DIR, 'jekyll-hyde-modernized.json');

const BOOK_ID = 'gutenberg-43';

// CLI flags
const args = process.argv.slice(2);
const clearCache = args.includes('--clear-cache');
const freshRun = args.includes('--fresh');

async function modernizeJekyllHyde() {
  try {
    console.log('🔄 Modernizing The Strange Case of Dr. Jekyll and Mr. Hyde...\n');

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
      throw new Error('Original text not found. Run fetch-jekyll-hyde.js first.');
    }

    const originalData = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf-8'));
    const fullText = originalData.fullText;

    console.log(`📖 Loaded original text (${fullText.split(/\s+/).length} words)`);

    // Create processing chunks - smaller than Romeo due to Jekyll & Hyde's complex Victorian language
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

      const modernizedText = await modernizeJekyllHydeChunk(chunk, i, chunks.length);

      modernizedChunks.push({
        chunkIndex: i,
        originalText: chunk,
        modernizedText: modernizedText,
        wordCount: modernizedText.split(/\s+/).length
      });

      // Save progress after each chunk
      const progressData = {
        bookId: BOOK_ID,
        title: "The Strange Case of Dr. Jekyll and Mr. Hyde (Modernized)",
        author: 'Robert Louis Stevenson',
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

    console.log(`\n🎉 Jekyll & Hyde modernization completed!`);
    console.log(`📊 Processed ${chunks.length} chunks`);

    return JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf-8'));

  } catch (error) {
    console.error('❌ Error modernizing Jekyll & Hyde:', error);
    throw error;
  }
}

function createOptimalChunks(text) {
  // Use 600-word chunks for complex Victorian text
  const maxWordsPerChunk = 600;
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

async function modernizeJekyllHydeChunk(text, chunkIndex, totalChunks) {
  const prompt = `MODERNIZE this Victorian text from "The Strange Case of Dr. Jekyll and Mr. Hyde" by Robert Louis Stevenson for contemporary readers.

MODERNIZATION RULES:
1. Update archaic Victorian vocabulary to modern equivalents
2. Simplify overly complex sentence structures while preserving meaning
3. Convert formal Victorian expressions to contemporary language
4. Maintain the dark, psychological atmosphere of the original
5. Keep all character names and plot elements intact
6. Preserve the scientific and medical terminology appropriate to the story
7. Convert archaic pronouns and verb forms to modern usage

SPECIFIC UPDATES NEEDED:
- "amongst" → "among"
- "whilst" → "while"
- "upon" → "on" (where natural)
- "presently" (meaning "soon") → "soon" or "in a moment"
- Victorian formal speech → modern conversational equivalents
- Complex Victorian sentence structures → clearer modern sentences
- Archaic verb forms → contemporary equivalents

PRESERVE COMPLETELY:
- The Gothic horror atmosphere
- Character names (Jekyll, Hyde, Utterson, Lanyon, etc.)
- Scientific terminology and medical references
- The story's psychological complexity
- Essential plot and character development

EXAMPLE TRANSFORMATION:
Original: "It was late in the afternoon, when Mr. Utterson found his way to Dr. Jekyll's door, where he was at once admitted by Poole, and carried down by the kitchen offices and across a yard which had once been a garden, to the building which was indifferently known as the laboratory or the dissecting-rooms."
Modern: "It was late in the afternoon when Mr. Utterson found his way to Dr. Jekyll's door, where Poole immediately let him in and led him down through the kitchen offices and across a yard that had once been a garden, to the building known as either the laboratory or the dissecting rooms."

TEXT TO MODERNIZE (Chunk ${chunkIndex + 1}/${totalChunks}):
${text}

CRITICAL: Maintain Stevenson's dark Victorian atmosphere while making the language accessible to modern readers.`;

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
  modernizeJekyllHyde().catch(console.error);
}

export { modernizeJekyllHyde };