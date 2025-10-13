#!/usr/bin/env node

/**
 * Simplify "The Metamorphosis" to A1 level with natural compound sentences
 * Following Master Mistakes Prevention guidelines for A1 implementation
 */

import { config } from 'dotenv';
import fs from 'fs';
import path from 'path';
import https from 'https';

// Load environment variables
config({ path: '.env.local' });

const BOOK_INFO = {
  id: 'the-metamorphosis',
  inputFile: 'the-metamorphosis-raw.txt',
  outputFileA1: 'the-metamorphosis-A1-simplified.txt'
};

// A1 Simplification Guidelines (Following The Necklace proven pattern)
const A1_GUIDELINES = `
- Use 500-1000 most common words
- Present and simple past tense only
- Natural compound sentences (8-12 words average - PROVEN BY MAYA STORY)
- MAXIMUM 12 WORDS PER SENTENCE (Master Prevention - prevents highlighting issues)
- Simple connectors: "and", "but", "when" (use sparingly, only when natural)
- No cultural references or explain very simply
- Maintain exact 1:1 sentence count mapping (CRITICAL)
- Generate natural flow sentences (NOT forced micro-sentences)
- AVOID: "He is sad. He cries. He goes." (robotic micro-sentences)
- CORRECT A1: "He is sad and cries." OR "He is sad. He cries because he feels bad." (natural flow)
- Each sentence should express one complete thought
- Avoid semicolons - use periods instead
- Preserve punctuation for proper formatting
- Validate natural reading flow
`;

// SCRIPT LEVEL VALIDATION - MANDATORY FIRST (prevents runtime failures)
const VALID_LEVELS = ['A1'];

// Get target level from command line argument
const targetLevel = process.argv[2];

// Validate level before proceeding
if (!targetLevel) {
  console.error('❌ Error: Please specify a CEFR level (A1)');
  console.log('Usage: node scripts/simplify-metamorphosis.js A1');
  process.exit(1);
}

if (!VALID_LEVELS.includes(targetLevel)) {
  console.error(`❌ Error: Invalid level "${targetLevel}". Valid levels: ${VALID_LEVELS.join(', ')}`);
  process.exit(1);
}

const CEFR_LEVEL = targetLevel;

// Comprehensive sentence cleaning function
function cleanSentenceForAPI(sentence) {
  return sentence
    .replace(/\\/g, '\\\\')        // Escape backslashes first
    .replace(/"/g, '\\"')          // Escape double quotes
    .replace(/'/g, "\\'")          // Escape single quotes
    .replace(/\n/g, ' ')           // Replace newlines with spaces
    .replace(/\r/g, ' ')           // Replace carriage returns
    .replace(/\t/g, ' ')           // Replace tabs
    .replace(/\s+/g, ' ')          // Normalize multiple spaces
    .replace(/--/g, ' - ')         // Handle em-dashes
    .replace(/\u2014/g, ' - ')     // Handle unicode em-dashes
    .replace(/\u2013/g, ' - ')     // Handle unicode en-dashes
    .replace(/[^\x20-\x7E]/g, ' ') // Remove non-ASCII characters except basic punctuation
    .trim();
}

// Helper function to call OpenAI API (primary option since Claude has issues)
async function callOpenAI(sentence, level) {
  return new Promise((resolve, reject) => {
    const cleanSentence = cleanSentenceForAPI(sentence);
    const guidelines = A1_GUIDELINES;

    const requestBody = JSON.stringify({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `You are a CEFR ${level} text simplification expert. Your task is to simplify each sentence to exactly ${level} level while maintaining the story meaning.

${guidelines}

CRITICAL RULES:
- Return ONLY the simplified sentence, no explanations
- Maintain exact sentence boundaries (no splitting or merging)
- Use natural ${level}-appropriate vocabulary
- Keep emotional tone and story meaning intact`
        },
        {
          role: "user",
          content: `Simplify this sentence to ${level} level: "${cleanSentence}"`
        }
      ],
      temperature: 0.3,
      max_tokens: 150
    });

    const req = https.request({
      hostname: 'api.openai.com',
      port: 443,
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Length': Buffer.byteLength(requestBody)
      }
    }, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          if (response.choices && response.choices[0] && response.choices[0].message) {
            resolve(response.choices[0].message.content.trim());
          } else {
            reject(new Error('Invalid response format from OpenAI'));
          }
        } catch (error) {
          reject(new Error(`Failed to parse OpenAI response: ${error.message}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(new Error(`OpenAI API request failed: ${error.message}`));
    });

    req.write(requestBody);
    req.end();
  });
}

async function simplifyMetamorphosis() {
  console.log(`🐛 Simplifying "The Metamorphosis" to ${CEFR_LEVEL} level...`);

  try {
    // Load the original text
    const inputPath = path.join(process.cwd(), 'cache', BOOK_INFO.inputFile);
    if (!fs.existsSync(inputPath)) {
      throw new Error(`Input file not found: ${inputPath}. Run fetch-metamorphosis.js first.`);
    }

    const originalText = fs.readFileSync(inputPath, 'utf-8');
    console.log(`📖 Loaded original text: ${originalText.length} characters`);

    // Split into sentences (preserving punctuation)
    const sentences = originalText.match(/[^.!?]*[.!?]/g) || [];
    console.log(`📝 Found ${sentences.length} sentences to simplify`);

    // Create cache for progress saving
    const cacheDir = path.join(process.cwd(), 'cache');
    const progressCacheFile = path.join(cacheDir, `metamorphosis-${CEFR_LEVEL}-progress.json`);

    let simplifiedSentences = [];
    let startIndex = 0;

    // Check for existing progress
    if (fs.existsSync(progressCacheFile)) {
      const progress = JSON.parse(fs.readFileSync(progressCacheFile, 'utf-8'));
      if (progress.sentences && Array.isArray(progress.sentences)) {
        simplifiedSentences = progress.sentences;
        startIndex = simplifiedSentences.length;
        console.log(`📥 Resuming from sentence ${startIndex} (${progress.sentences.length} already completed)`);
      }
    }

    // Process sentences in batches
    const batchSize = 10;
    for (let i = startIndex; i < sentences.length; i += batchSize) {
      const batch = sentences.slice(i, Math.min(i + batchSize, sentences.length));
      console.log(`🔄 Processing sentences ${i + 1}-${Math.min(i + batchSize, sentences.length)} of ${sentences.length}`);

      for (let j = 0; j < batch.length; j++) {
        const sentence = batch[j].trim();
        if (sentence.length === 0) continue;

        try {
          console.log(`   ${i + j + 1}. "${sentence.substring(0, 50)}${sentence.length > 50 ? '...' : ''}"`);

          const simplified = await callOpenAI(sentence, CEFR_LEVEL);
          simplifiedSentences.push(simplified);

          console.log(`      → "${simplified}"`);

          // Save progress after each sentence
          const progress = {
            bookId: BOOK_INFO.id,
            level: CEFR_LEVEL,
            totalSentences: sentences.length,
            sentences: simplifiedSentences,
            lastUpdated: new Date().toISOString()
          };
          fs.writeFileSync(progressCacheFile, JSON.stringify(progress, null, 2));

          // Rate limiting
          await new Promise(resolve => setTimeout(resolve, 500));

        } catch (error) {
          console.error(`❌ Error simplifying sentence ${i + j + 1}: ${error.message}`);
          console.log('💾 Progress saved. You can resume by running the script again.');
          process.exit(1);
        }
      }
    }

    // Validate sentence count
    if (simplifiedSentences.length !== sentences.length) {
      throw new Error(`Sentence count mismatch: original ${sentences.length}, simplified ${simplifiedSentences.length}`);
    }

    // Join sentences and save final result
    const simplifiedText = simplifiedSentences.join(' ');
    const outputPath = path.join(cacheDir, BOOK_INFO.outputFileA1);
    fs.writeFileSync(outputPath, simplifiedText, 'utf-8');

    // Save metadata
    const metadata = {
      originalSentences: sentences.length,
      simplifiedSentences: simplifiedSentences.length,
      level: CEFR_LEVEL,
      completedAt: new Date().toISOString(),
      wordCount: simplifiedText.split(/\s+/).length
    };

    const metadataPath = path.join(cacheDir, `the-metamorphosis-${CEFR_LEVEL}-metadata.json`);
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

    // Clean up progress cache
    if (fs.existsSync(progressCacheFile)) {
      fs.unlinkSync(progressCacheFile);
    }

    console.log(`✅ Simplification complete!`);
    console.log(`📊 Results:`);
    console.log(`   - Level: ${CEFR_LEVEL}`);
    console.log(`   - Sentences: ${simplifiedSentences.length}`);
    console.log(`   - Words: ${metadata.wordCount}`);
    console.log(`💾 Saved to: ${outputPath}`);
    console.log(`📈 Ready for Phase 3: Audio bundle generation`);

  } catch (error) {
    console.error('❌ Error during simplification:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  simplifyMetamorphosis();
}

export { simplifyMetamorphosis };