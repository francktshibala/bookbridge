#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import OpenAI from 'openai';

// Yellow Wallpaper Configuration
const BOOK_ID = 'yellow-wallpaper';
const PROJECT_ROOT = path.resolve(process.cwd());
const CACHE_DIR = path.join(PROJECT_ROOT, 'cache');
const INPUT_FILE = path.join(CACHE_DIR, 'yellow-wallpaper-original.json');
const OUTPUT_FILE = path.join(CACHE_DIR, 'yellow-wallpaper-modernized.json');

// CLI flags
const args = process.argv.slice(2);
const clearCache = args.includes('--clear-cache');
const freshRun = args.includes('--fresh');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function modernizeYellowWallpaper() {
  try {
    console.log('📝 Modernizing The Yellow Wallpaper for contemporary readers...\n');

    // Clear cache if requested
    if (clearCache && fs.existsSync(OUTPUT_FILE)) {
      fs.unlinkSync(OUTPUT_FILE);
      console.log('🗑️ Cleared existing cache');
    }

    // Check for existing cache
    if (fs.existsSync(OUTPUT_FILE) && !freshRun) {
      console.log('📄 Found cached modernized content');
      const cached = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf-8'));
      if (cached.totalChunks && cached.chunks.length >= cached.totalChunks) {
        console.log(`✅ Modernization already complete: ${cached.chunks.length} chunks`);
        return cached;
      }
    }

    // Load original text
    if (!fs.existsSync(INPUT_FILE)) {
      throw new Error(`Original text not found. Run fetch-yellow-wallpaper.js first.`);
    }

    const originalData = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf-8'));
    console.log(`📖 Loaded original text (${originalData.chunks[0].wordCount} words)`);

    // Split the large text into manageable chunks
    const originalText = originalData.chunks[0].text;
    const textChunks = createOptimalChunks(originalText);
    console.log(`🔪 Split into ${textChunks.length} chunks for processing`);

    // Initialize modernized data
    const modernizedData = {
      bookId: BOOK_ID,
      title: 'The Yellow Wallpaper',
      author: 'Charlotte Perkins Gilman',
      totalChunks: textChunks.length,
      chunks: [],
      modernizedAt: new Date().toISOString()
    };

    // Load existing progress if any
    if (fs.existsSync(OUTPUT_FILE)) {
      const existingData = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf-8'));
      modernizedData.chunks = existingData.chunks || [];
    }

    // Process each chunk
    for (let i = modernizedData.chunks.length; i < textChunks.length; i++) {
      const chunk = textChunks[i];
      console.log(`\n🔄 Modernizing chunk ${i + 1}/${textChunks.length}...`);
      console.log(`📏 Chunk size: ${chunk.wordCount} words, ${estimateTokens(chunk.text)} tokens`);

      const modernizedText = await modernizeChunk(chunk.text, i, textChunks.length);

      const modernizedChunk = {
        chunkIndex: i,
        originalText: chunk.text,
        modernizedText: modernizedText,
        wordCount: modernizedText.split(/\s+/).length,
        paragraphCount: modernizedText.split(/\n\s*\n/).length,
        startPosition: chunk.startPosition,
        endPosition: chunk.endPosition
      };

      modernizedData.chunks.push(modernizedChunk);

      // Save progress after each chunk
      fs.writeFileSync(OUTPUT_FILE, JSON.stringify(modernizedData, null, 2));
      console.log(`✅ Completed chunk ${i + 1}, saved progress`);

      // Rate limiting - pause between requests
      if (i < textChunks.length - 1) {
        console.log('⏱️ Waiting 2 seconds before next request...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    // Combine all modernized chunks into final text
    const finalModernizedText = modernizedData.chunks.map(chunk => chunk.modernizedText).join('\n\n');
    modernizedData.finalText = finalModernizedText;
    modernizedData.totalWordCount = finalModernizedText.split(/\s+/).length;

    // Save final result
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(modernizedData, null, 2));

    console.log('\n🎉 Yellow Wallpaper modernization completed successfully!');
    console.log(`📊 Processed ${modernizedData.chunks.length} chunks`);
    console.log(`📝 Final text: ${modernizedData.totalWordCount} words`);
    return modernizedData;

  } catch (error) {
    console.error('❌ Error modernizing Yellow Wallpaper:', error);
    throw error;
  }
}

// Token estimation function (rough approximation: 1 token ≈ 0.75 words)
function estimateTokens(text) {
  return Math.ceil(text.split(/\s+/).length * 1.33);
}

// Create optimal chunks that stay within token limits
function createOptimalChunks(text) {
  const TARGET_CHUNK_SIZE = 1200; // words per chunk (≈1600 tokens)
  const MAX_CHUNK_SIZE = 1500; // maximum words per chunk (≈2000 tokens)
  const MIN_CHUNK_SIZE = 800; // minimum words per chunk to avoid too many small chunks

  const words = text.split(/\s+/);
  const totalWords = words.length;
  const chunks = [];

  console.log(`📊 Total words to process: ${totalWords}`);

  // Split by natural breaks: sentences ending with periods, exclamation marks, or question marks
  // followed by a space and capital letter or quotation mark
  const sentences = text.split(/(?<=[.!?])\s+(?=[A-Z"])/);
  console.log(`📖 Found ${sentences.length} sentences`);

  let currentChunk = '';
  let currentWordCount = 0;
  let startPosition = 0;

  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i].trim();
    const sentenceWordCount = sentence.split(/\s+/).length;

    // If adding this sentence would exceed our target size, save current chunk
    if (currentWordCount > 0 && (currentWordCount + sentenceWordCount) > TARGET_CHUNK_SIZE) {
      // Save current chunk if it's substantial enough
      if (currentWordCount >= MIN_CHUNK_SIZE) {
        chunks.push({
          text: currentChunk.trim(),
          wordCount: currentWordCount,
          startPosition: startPosition,
          endPosition: startPosition + currentChunk.length
        });

        startPosition += currentChunk.length + 1;
        currentChunk = '';
        currentWordCount = 0;
      }
    }

    // Add sentence to current chunk
    if (currentChunk.length > 0) {
      currentChunk += ' ' + sentence;
    } else {
      currentChunk = sentence;
    }
    currentWordCount += sentenceWordCount;

    // If this single sentence is too large, we need to split it by clauses
    if (sentenceWordCount > MAX_CHUNK_SIZE) {
      console.log(`⚠️ Warning: Large sentence detected (${sentenceWordCount} words). Will split by clauses.`);

      // Emergency split: break on commas, semicolons, or dashes for very long sentences
      const clauses = sentence.split(/[,;—](?=\s)/);
      if (clauses.length > 1) {
        // Reset current chunk and process clauses separately
        currentChunk = '';
        currentWordCount = 0;

        for (const clause of clauses) {
          const clauseWords = clause.trim().split(/\s+/).length;
          if (currentWordCount + clauseWords > TARGET_CHUNK_SIZE && currentWordCount > 0) {
            chunks.push({
              text: currentChunk.trim(),
              wordCount: currentWordCount,
              startPosition: startPosition,
              endPosition: startPosition + currentChunk.length
            });
            startPosition += currentChunk.length + 1;
            currentChunk = clause.trim();
            currentWordCount = clauseWords;
          } else {
            if (currentChunk.length > 0) {
              currentChunk += ', ' + clause.trim();
            } else {
              currentChunk = clause.trim();
            }
            currentWordCount += clauseWords;
          }
        }
      }
    }
  }

  // Don't forget the last chunk
  if (currentChunk.trim().length > 0) {
    chunks.push({
      text: currentChunk.trim(),
      wordCount: currentWordCount,
      startPosition: startPosition,
      endPosition: startPosition + currentChunk.length
    });
  }

  // Log chunk information
  console.log(`🔪 Created ${chunks.length} chunks:`);
  chunks.forEach((chunk, index) => {
    console.log(`📝 Chunk ${index + 1}: ${chunk.wordCount} words (~${estimateTokens(chunk.text)} tokens)`);
  });

  return chunks;
}

async function modernizeChunk(originalText, chunkIndex, totalChunks) {
  // Create context-aware prompt based on chunk position
  let contextNote = '';
  if (chunkIndex === 0) {
    contextNote = 'This is the BEGINNING of the story. Establish the narrator\'s voice and situation clearly.';
  } else if (chunkIndex === totalChunks - 1) {
    contextNote = 'This is the ENDING of the story. Maintain the climactic psychological conclusion.';
  } else {
    contextNote = `This is chunk ${chunkIndex + 1} of ${totalChunks} in the middle of the story. Maintain narrative continuity.`;
  }

  const prompt = `
CRITICAL RULES:
- PRESERVE STORY MEANING 100% - no plot changes
- Modernize dated expressions for contemporary understanding
- Maintain Charlotte Perkins Gilman's literary style and tone
- Keep all proper nouns unchanged
- This is "The Yellow Wallpaper" from 1892

CONTEXT: ${contextNote}

MODERNIZATION FOCUS:
- Update archaic medical terminology to be understandable
- Modernize dated social expressions while preserving period context
- Keep the psychological horror and feminist themes intact
- Maintain the diary/journal style and first-person narration
- Preserve all dialogue and character interactions exactly
- Ensure smooth flow for readers transitioning between chunks

EXAMPLES:
- "nervous depression" → "anxiety and depression"
- "hysterical tendency" → "emotional sensitivity"
- "phosphates or phosphites" → "supplements or medications"
- "queer" (meaning strange) → "strange" or "odd"
- Keep Victorian setting references but make language accessible

TEXT TO MODERNIZE:
${originalText}

MODERNIZED TEXT:`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 2000, // Conservative limit to ensure we stay within 8192 total
      temperature: 0.3
    });

    return response.choices[0].message.content.trim();
  } catch (error) {
    console.error('❌ OpenAI API error:', error);
    throw error;
  }
}

// Execute if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  modernizeYellowWallpaper().catch(console.error);
}

export { modernizeYellowWallpaper };