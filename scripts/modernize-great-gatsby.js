#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Resolve absolute paths anchored to the project root (one level up from scripts/)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');
const CACHE_DIR = path.join(PROJECT_ROOT, 'cache');

const INPUT_FILE = path.join(PROJECT_ROOT, 'data', 'great-gatsby', 'original.txt');
const OUTPUT_FILE = path.join(PROJECT_ROOT, 'data', 'great-gatsby', 'modernized.txt');
const CACHE_FILE = path.join(CACHE_DIR, 'great-gatsby-modernized.json');
const CHAPTERS_FILE = path.join(PROJECT_ROOT, 'data', 'great-gatsby', 'chapters.json');

async function modernizeGreatGatsby() {
  console.log('🔄 Starting modernization of "The Great Gatsby"...');
  console.log('📋 Strategy: Conservative 1920s → contemporary modernization');
  console.log('🎯 Goal: Preserve Fitzgerald\'s style while updating dated language');
  
  // CLI flags
  // --no-cache or --fresh: ignore any existing cache
  // --clear-cache: remove cache before starting
  // --cache-file=/absolute/or/relative/path.json: override cache path
  const rawArgs = process.argv.slice(2);
  const args = new Set(rawArgs.filter(a => !a.includes('=')));
  const argPairs = rawArgs.filter(a => a.includes('='))
    .map(a => {
      const idx = a.indexOf('=');
      return [a.slice(0, idx), a.slice(idx + 1)];
    });
  const argMap = Object.fromEntries(argPairs);
  
  let cacheFilePath = CACHE_FILE;
  if (argMap['--cache-file']) {
    cacheFilePath = path.resolve(argMap['--cache-file']);
  }

  console.log(`ℹ️ Using absolute paths:`);
  console.log(`   • INPUT_FILE:    ${INPUT_FILE}`);
  console.log(`   • OUTPUT_FILE:   ${OUTPUT_FILE}`);
  console.log(`   • CACHE_FILE:    ${cacheFilePath}`);
  console.log(`   • CHAPTERS_FILE: ${CHAPTERS_FILE}`);

  // Clear cache if requested
  if (args.has('--clear-cache')) {
    try {
      if (fs.existsSync(cacheFilePath)) {
        fs.unlinkSync(cacheFilePath);
        console.log('🧹 Cleared existing cache file');
      } else {
        console.log('🧹 No cache file to clear');
      }
    } catch (e) {
      console.warn('⚠️ Failed to clear cache:', e instanceof Error ? e.message : e);
    }
  }

  // Check for cached results first (only exit early if cache appears COMPLETE)
  if (!args.has('--no-cache') && !args.has('--fresh') && fs.existsSync(cacheFilePath)) {
    console.log('💾 Found cached modernization, validating...');
    try {
      const cached = JSON.parse(fs.readFileSync(cacheFilePath, 'utf8'));
      const total = Number(cached?.totalChunks || 0);
      const have = Array.isArray(cached?.chunks) ? cached.chunks.length : 0;
      console.log(`✅ Loaded ${have} cached chunks (reported total: ${total})`);

      if (total > 0 && have >= total) {
        // Fully complete cache → write and exit
        const modernizedText = cached.chunks.map(chunk => chunk.modernized).join('\n\n');
        fs.writeFileSync(OUTPUT_FILE, modernizedText, 'utf8');
        console.log(`✅ Modernized text saved to: ${OUTPUT_FILE}`);
        await generateStats(modernizedText);
        return;
      }

      console.log('⚠️ Cache is partial or invalid. Proceeding with full processing.');
    } catch (error) {
      console.log('❌ Cache file unreadable/corrupted, proceeding with fresh modernization');
    }
  }

  // Create cache directory
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }

  // Read original text and chapter structure
  const originalText = fs.readFileSync(INPUT_FILE, 'utf8');
  let chapters = [];

  if (fs.existsSync(CHAPTERS_FILE)) {
    chapters = JSON.parse(fs.readFileSync(CHAPTERS_FILE, 'utf8'));
    console.log(`📚 Using ${chapters.length} detected chapters for structure`);
  }

  console.log(`📖 Processing ${originalText.length.toLocaleString()} characters`);

  // Split into manageable chunks (preserve paragraph boundaries)
  const paragraphs = originalText.split(/\n\s*\n/).filter(p => p.trim().length > 0);
  console.log(`📑 Processing ${paragraphs.length} paragraphs`);

  // Process in batches of 3-4 paragraphs for better context
  const chunks = [];
  const batchSize = 3; // Smaller batches for Great Gatsby due to complex prose

  for (let i = 0; i < paragraphs.length; i += batchSize) {
    const batch = paragraphs.slice(i, i + batchSize);

    // Find which chapter this chunk belongs to
    const chunkStart = originalText.indexOf(batch[0]);
    const currentChapter = chapters.find(ch =>
      chunkStart >= ch.startPosition && chunkStart < ch.endPosition
    );

    chunks.push({
      index: Math.floor(i / batchSize),
      original: batch.join('\n\n'),
      paragraphStart: i + 1,
      paragraphEnd: Math.min(i + batchSize, paragraphs.length),
      chapter: currentChapter ? {
        number: currentChapter.number,
        title: currentChapter.title,
        theme: currentChapter.theme
      } : null
    });
  }

  console.log(`🔄 Processing ${chunks.length} chunks`);

  const modernizedChunks = [];

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const chapterInfo = chunk.chapter ? `(Chapter ${chunk.chapter.number}: ${chunk.chapter.title})` : '';
    console.log(`Processing chunk ${i + 1}/${chunks.length} (paragraphs ${chunk.paragraphStart}-${chunk.paragraphEnd}) ${chapterInfo}...`);

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: `You are modernizing "The Great Gatsby" for contemporary readers while preserving Fitzgerald's literary artistry.

CRITICAL RULES:
- PRESERVE STORY MEANING 100% - no plot changes, no character changes, no symbolic changes
- Modernize 1920s expressions and dated social references for contemporary understanding
- Maintain Fitzgerald's poetic and symbolic language style
- Keep all proper nouns, character names, and place names unchanged
- Preserve the sophisticated literary tone and imagery

MODERNIZATION FOCUS - 1920s → Contemporary:
- "motor-car" → "car"
- "telephone" → "phone" (when casual)
- "automobile" → "car"
- "wireless" → "radio"
- "moving-picture" → "movie"
- "Great War" → "World War I"
- Outdated social attitudes → contemporary phrasing while preserving historical context
- Victorian formalities → modern conversational tone where appropriate

PRESERVE FITZGERALD'S STYLE:
- Keep poetic metaphors and symbolic imagery
- Maintain sophisticated vocabulary and literary devices
- Preserve the rhythm and flow of complex sentences
- Keep atmospheric descriptions of the Jazz Age
- Maintain social commentary and class observations

SENTENCE STRUCTURE:
- Occasionally break up extremely long sentences (200+ words) into 2 sentences
- Maintain the same information, mood, and literary effect
- Keep Fitzgerald's characteristic flowing narrative style

${chunk.chapter ? `CHAPTER CONTEXT: This is from Chapter ${chunk.chapter.number} "${chunk.chapter.title}" - ${chunk.chapter.theme}` : ''}

Return ONLY the modernized text, no explanations.`
          },
          {
            role: 'user',
            content: chunk.original
          }
        ],
        temperature: 0.1, // Lower temperature for more consistent literary preservation
        max_tokens: 2500
      });

      const modernizedChunk = response.choices[0].message.content;

      modernizedChunks.push({
        index: chunk.index,
        original: chunk.original,
        modernized: modernizedChunk,
        paragraphRange: `${chunk.paragraphStart}-${chunk.paragraphEnd}`,
        chapter: chunk.chapter
      });

      // Save progress to cache after each chunk
      const cacheData = {
        title: 'The Great Gatsby - Modernization',
        processedAt: new Date().toISOString(),
        totalChunks: chunks.length,
        completedChunks: modernizedChunks.length,
        chunks: modernizedChunks
      };

      fs.writeFileSync(cacheFilePath, JSON.stringify(cacheData, null, 2), 'utf8');

      console.log(`  ✅ Chunk ${i + 1} complete (${modernizedChunk.length} characters)`);

      // Small delay to be respectful to API
      await new Promise(resolve => setTimeout(resolve, 750));

    } catch (error) {
      console.error(`❌ Error processing chunk ${i + 1}:`, error.message);

      // Save progress before throwing
      if (modernizedChunks.length > 0) {
        const cacheData = {
          title: 'The Great Gatsby - Modernization (Partial)',
          processedAt: new Date().toISOString(),
          totalChunks: chunks.length,
          completedChunks: modernizedChunks.length,
          chunks: modernizedChunks,
          error: {
            message: error.message,
            failedChunk: i + 1
          }
        };
        fs.writeFileSync(cacheFilePath, JSON.stringify(cacheData, null, 2), 'utf8');
        console.log(`💾 Progress saved to cache before error`);
      }

      throw error;
    }
  }

  // Combine all modernized chunks
  const modernizedText = modernizedChunks.map(chunk => chunk.modernized).join('\n\n');

  // Save modernized text
  fs.writeFileSync(OUTPUT_FILE, modernizedText, 'utf8');

  console.log(`✅ Modernization complete!`);
  console.log(`📁 Modernized text saved to: ${OUTPUT_FILE}`);
  console.log(`💾 Cache saved to: ${cacheFilePath}`);

  await generateStats(modernizedText);

  console.log('');
  console.log('🚀 Next steps:');
  console.log('1. Review modernized text for quality and Fitzgerald style preservation');
  console.log('2. Create simplification script: node scripts/simplify-great-gatsby.js A2');
}

async function generateStats(modernizedText) {
  const originalText = fs.readFileSync(INPUT_FILE, 'utf8');

  // Basic stats
  const originalWords = originalText.split(/\s+/).length;
  const modernizedWords = modernizedText.split(/\s+/).length;
  const originalSentences = originalText.split(/[.!?]+\s+/).filter(s => s.trim().length > 20).length;
  const modernizedSentences = modernizedText.split(/[.!?]+\s+/).filter(s => s.trim().length > 20).length;

  console.log('');
  console.log('📊 Modernization Statistics:');
  console.log(`   Original text: ${originalWords.toLocaleString()} words, ${originalSentences} sentences`);
  console.log(`   Modernized text: ${modernizedWords.toLocaleString()} words, ${modernizedSentences} sentences`);
  console.log(`   Word change: ${modernizedWords > originalWords ? '+' : ''}${modernizedWords - originalWords} (${((modernizedWords - originalWords) / originalWords * 100).toFixed(1)}%)`);
  console.log(`   Sentence change: ${modernizedSentences > originalSentences ? '+' : ''}${modernizedSentences - originalSentences} (${((modernizedSentences - originalSentences) / originalSentences * 100).toFixed(1)}%)`);

  // Chapter-based analysis if available
  if (fs.existsSync(CHAPTERS_FILE)) {
    const chapters = JSON.parse(fs.readFileSync(CHAPTERS_FILE, 'utf8'));
    console.log(`📚 Chapter-based analysis for ${chapters.length} chapters available in metadata`);
  }

  // Save modernization metadata
  const metadata = {
    title: 'The Great Gatsby - Modernized',
    author: 'F. Scott Fitzgerald (modernized for contemporary readers)',
    processedAt: new Date().toISOString(),
    stats: {
      original: {
        words: originalWords,
        sentences: originalSentences,
        characters: originalText.length
      },
      modernized: {
        words: modernizedWords,
        sentences: modernizedSentences,
        characters: modernizedText.length
      },
      changes: {
        wordDelta: modernizedWords - originalWords,
        sentenceDelta: modernizedSentences - originalSentences,
        wordChangePercent: ((modernizedWords - originalWords) / originalWords * 100),
        sentenceChangePercent: ((modernizedSentences - originalSentences) / originalSentences * 100)
      }
    },
    processing: {
      strategy: '1920s_to_contemporary_modernization',
      preserveFitzgeraldStyle: true,
      preserveStoryMeaning: true,
      model: 'gpt-4-turbo-preview',
      batchSize: 3,
      chapterAware: fs.existsSync(CHAPTERS_FILE)
    },
    modernizationFocus: [
      '1920s expressions updated to contemporary language',
      'Dated technology references modernized',
      'Social attitudes expressed in contemporary terms',
      'Literary style and symbolism fully preserved',
      'Character development and plot unchanged'
    ]
  };

  // Ensure output directory exists
  const outputDir = 'data/great-gatsby';
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(
    'data/great-gatsby/modernization-metadata.json',
    JSON.stringify(metadata, null, 2),
    'utf8'
  );

  console.log(`📋 Modernization metadata saved to: data/great-gatsby/modernization-metadata.json`);
}

modernizeGreatGatsby()
  .then(() => {
    console.log('🎉 Great Gatsby modernization process complete!');
    console.log('📖 Text ready for A2 simplification while preserving literary quality');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Modernization failed:', error);
    console.log('💾 Check cache file for any saved progress');
    process.exit(1);
  });