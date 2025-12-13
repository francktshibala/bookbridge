#!/usr/bin/env node

/**
 * Simplify "Single Parent Rising #1" to A1 or A2 level
 * Usage: node scripts/simplify-single-parent-rising-1.js [A1|A2]
 */

const { config } = require('dotenv');
const fs = require('fs');
const path = require('path');
const OpenAI = require('openai');

// Load environment variables
config({ path: path.join(__dirname, '..', '.env.local') });

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const STORY_ID = 'single-parent-rising-1';
const CACHE_DIR = path.join(__dirname, '..', 'cache');

// SCRIPT LEVEL VALIDATION - MANDATORY FIRST
const VALID_LEVELS = ['A1', 'A2'];

// Get target level from command line argument
const targetLevel = process.argv[2];

// Validate level before proceeding
if (!targetLevel) {
  console.error('❌ Error: Please specify a CEFR level (A1 or A2)');
  console.log('Usage: node scripts/simplify-single-parent-rising-1.js [A1|A2]');
  process.exit(1);
}

if (!VALID_LEVELS.includes(targetLevel)) {
  console.error(`❌ Error: Invalid level "${targetLevel}". Valid levels: ${VALID_LEVELS.join(', ')}`);
  process.exit(1);
}

const CEFR_LEVEL = targetLevel;

const INPUT_FILE = path.join(CACHE_DIR, `${STORY_ID}-original.txt`);
const OUTPUT_FILE = path.join(CACHE_DIR, `${STORY_ID}-${CEFR_LEVEL}-simplified.txt`);
const CACHE_FILE = path.join(CACHE_DIR, `${STORY_ID}-${CEFR_LEVEL}-simplified.json`);

// A1 Simplification Guidelines
const A1_GUIDELINES = `
- Use 500-1000 most common words
- Present and simple past tense only
- Natural compound sentences (6-12 words average)
- MAXIMUM 12 WORDS PER SENTENCE
- Simple connectors: "and", "but", "when" (use sparingly, only when natural)
- No cultural references or explain very simply
- Maintain exact 1:1 sentence count mapping (CRITICAL)
- Generate natural flow sentences (NOT forced micro-sentences)
- AVOID: "She is sad. She cries. She goes." (robotic micro-sentences)
- CORRECT A1: "She is sad and cries." OR "She is sad. She cries because she feels bad." (natural flow)
- Each sentence should express one complete thought
- Avoid semicolons - use periods instead
- Preserve punctuation for proper formatting
- Keep proper nouns: Lisa, James, Emily, Noah, "Parents for Life", etc.
`;

// A2 Simplification Guidelines
const A2_GUIDELINES = `
- Use 1000-2000 most common words
- Present, past, and simple future tenses
- Natural compound sentences (8-15 words average)
- MAXIMUM 15 WORDS PER SENTENCE
- More connectors: "and", "but", "when", "because", "so", "then"
- Some subordinate clauses allowed
- More descriptive vocabulary allowed
- Maintain exact 1:1 sentence count mapping (CRITICAL)
- Generate natural flow sentences with varied structures
- Can use more complex sentence patterns than A1
- Each sentence should express one complete thought
- Avoid semicolons - use periods or commas with connectors
- Preserve punctuation for proper formatting
- Keep proper nouns: Lisa, James, Emily, Noah, "Parents for Life", etc.
`;

const guidelines = {
  'A1': A1_GUIDELINES,
  'A2': A2_GUIDELINES
};

const WORD_LIMITS = {
  'A1': 12,
  'A2': 15
};

// Helper function to call OpenAI API
async function callOpenAI(sentence, retryCount = 0) {
  const cleanSentence = sentence
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/'/g, "\\'")
    .replace(/\n/g, ' ')
    .replace(/\r/g, ' ')
    .replace(/\t/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const maxAttempts = 3;
  const wordLimit = WORD_LIMITS[CEFR_LEVEL];
  const levelGuidelines = guidelines[CEFR_LEVEL];

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 200,
      messages: [{
        role: 'user',
        content: `You are simplifying ONE sentence to ${CEFR_LEVEL} level. Return EXACTLY ONE sentence.

${levelGuidelines}

Original sentence: "${cleanSentence}"

CRITICAL RULES:
1. Return EXACTLY ONE sentence (not two or three sentences)
2. Maximum ${wordLimit} words total - if too long, use connectors to combine ideas into ONE sentence
3. Use appropriate vocabulary for ${CEFR_LEVEL} level
4. Use connectors appropriately to create natural flow within ONE sentence
5. Keep the complete meaning and emotion
6. Keep proper nouns unchanged (Lisa, James, Emily, Noah, "Parents for Life", etc.)
7. Return ONLY the simplified sentence, no explanations

Simplified sentence:`
      }],
      temperature: 0.3,
    });

    let simplified = response.choices[0].message.content.trim();

    // Remove quotes if present
    simplified = simplified.replace(/^["']|["']$/g, '');

    // Ensure only first sentence if multiple returned
    const sentences = simplified.split(/[.!?]+/).filter(s => s.trim().length > 0);
    if (sentences.length > 0) {
      simplified = sentences[0].trim();
      // Add period if missing
      if (!/[.!?]$/.test(simplified)) {
        simplified += '.';
      }
    }

    // Validate word count
    const words = simplified.split(/\s+/).length;
    if (words > wordLimit && retryCount < maxAttempts) {
      console.log(`⚠️  Sentence too long (${words} words, max ${wordLimit}), retrying...`);
      return callOpenAI(sentence, retryCount + 1);
    }

    return simplified;
  } catch (error) {
    if (retryCount < maxAttempts) {
      console.log(`⚠️  Error, retrying (attempt ${retryCount + 1}/${maxAttempts})...`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      return callOpenAI(sentence, retryCount + 1);
    }
    throw error;
  }
}

// Split text into sentences
function splitIntoSentences(text) {
  // Remove section headers (lines starting with **)
  text = text.replace(/^\*\*.*?\*\*$/gm, '');

  // Split by sentence-ending punctuation
  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.match(/^\*\*.*?\*\*$/));

  return sentences;
}

// Main simplification function
async function simplify() {
  console.log(`📝 Simplifying Single Parent Rising #1 to ${CEFR_LEVEL} level...`);
  const targetMinutes = CEFR_LEVEL === 'A1' ? 20 : 20; // A2 also targets 20+ minutes
  console.log(`🎯 Target: At least ${targetMinutes} minutes reading time`);

  // Read original text
  if (!fs.existsSync(INPUT_FILE)) {
    console.error(`❌ Input file not found: ${INPUT_FILE}`);
    process.exit(1);
  }

  const originalText = fs.readFileSync(INPUT_FILE, 'utf-8');
  const sentences = splitIntoSentences(originalText);

  console.log(`📊 Original: ${sentences.length} sentences`);

  // Load cache if exists
  let cache = { sentences: [], processed: 0 };
  if (fs.existsSync(CACHE_FILE)) {
    cache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'));
    console.log(`📦 Resuming from cache: ${cache.processed}/${sentences.length} sentences`);
  }

  // Process sentences
  for (let i = cache.processed; i < sentences.length; i++) {
    const sentence = sentences[i];

    if (!sentence.trim()) continue;

    console.log(`\n[${i + 1}/${sentences.length}] Processing...`);
    console.log(`Original: ${sentence.substring(0, 80)}...`);

    try {
      const simplified = await callOpenAI(sentence);
      cache.sentences.push(simplified);
      cache.processed = i + 1;

      console.log(`Simplified: ${simplified}`);

      // Save cache every 10 sentences
      if ((i + 1) % 10 === 0) {
        fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2), 'utf-8');
        console.log(`💾 Progress saved (${i + 1}/${sentences.length})`);
      }

      // Small delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error(`❌ Error processing sentence ${i + 1}:`, error.message);
      throw error;
    }
  }

  // Combine simplified sentences
  const simplifiedText = cache.sentences.join(' ');

  // Save final output
  fs.writeFileSync(OUTPUT_FILE, simplifiedText, 'utf-8');
  fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2), 'utf-8');

  // Calculate statistics
  const wordCount = simplifiedText.split(/\s+/).length;
  const charCount = simplifiedText.length;
  const readingSpeed = CEFR_LEVEL === 'A1' ? 80 : 90; // A2 slightly faster
  const estimatedMinutes = Math.round(wordCount / readingSpeed);

  console.log(`\n✅ Simplification complete!`);
  console.log(`📊 Statistics:`);
  console.log(`   - Sentences: ${cache.sentences.length}`);
  console.log(`   - Words: ${wordCount.toLocaleString()}`);
  console.log(`   - Characters: ${charCount.toLocaleString()}`);
  console.log(`   - Estimated reading time: ~${estimatedMinutes} minutes (${CEFR_LEVEL} level)`);

  if (estimatedMinutes < targetMinutes) {
    console.log(`\n⚠️  WARNING: Story is ${estimatedMinutes} minutes, target is at least ${targetMinutes} minutes.`);
    console.log(`   Consider expanding the story before simplification.`);
  } else {
    console.log(`\n✅ Target met: ${estimatedMinutes} minutes (≥${targetMinutes} minutes)`);
  }

  return simplifiedText;
}

if (require.main === module) {
  simplify().catch(console.error);
}

module.exports = { simplify };

