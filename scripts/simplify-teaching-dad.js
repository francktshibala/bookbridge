#!/usr/bin/env node

/**
 * Simplify "First-Gen Student Teaching Dad to Read" to A1 level
 * Target: At least 20 minutes reading time (A1 level)
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

const STORY_ID = 'teaching-dad-to-read';

// Get target level from command line argument or default to A1
const targetLevel = process.argv[2] || 'A1';
const VALID_LEVELS = ['A1', 'A2'];

if (!VALID_LEVELS.includes(targetLevel)) {
  console.error(`❌ Error: Invalid level "${targetLevel}". Valid levels: ${VALID_LEVELS.join(', ')}`);
  console.log('Usage: node scripts/simplify-teaching-dad.js [A1|A2]');
  process.exit(1);
}

const CEFR_LEVEL = targetLevel;
const CACHE_DIR = path.join(__dirname, '..', 'cache');

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
- Keep proper nouns: Mia, David, etc.
`;

// A2 Simplification Guidelines
const A2_GUIDELINES = `
- Use 1000-2000 most common words
- Present, simple past, and simple future tenses
- Moderate sentences (8-15 words average)
- MAXIMUM 15 WORDS PER SENTENCE
- More connectors: "and", "but", "when", "because", "so", "after", "before"
- Some subordinate clauses allowed
- Maintain exact 1:1 sentence count mapping (CRITICAL)
- Generate natural flow sentences (NOT forced micro-sentences)
- Each sentence should express one complete thought
- Avoid semicolons - use periods instead
- Preserve punctuation for proper formatting
- Keep proper nouns: Mia, David, etc.
`;

const GUIDELINES = CEFR_LEVEL === 'A1' ? A1_GUIDELINES : A2_GUIDELINES;
const MAX_WORDS = CEFR_LEVEL === 'A1' ? 12 : 15;

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

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 200,
      messages: [{
        role: 'user',
        content: `You are simplifying ONE sentence to ${CEFR_LEVEL} level. Return EXACTLY ONE sentence.

${GUIDELINES}

Original sentence: "${cleanSentence}"

CRITICAL RULES:
1. Return EXACTLY ONE sentence (not two or three sentences)
2. Maximum ${MAX_WORDS} words total - if too long, use connectors to combine ideas into ONE sentence
3. ${CEFR_LEVEL === 'A1' ? 'Use 500-1000 most common words only' : 'Use 1000-2000 most common words'}
4. Use appropriate connectors to create natural flow within ONE sentence
5. Keep the complete meaning and emotion
6. Keep proper nouns unchanged (Mia, David, etc.)
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
    if (words > MAX_WORDS && retryCount < maxAttempts) {
      console.log(`⚠️  Sentence too long (${words} words), retrying...`);
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
async function simplifyStory() {
  console.log(`📝 Simplifying to ${CEFR_LEVEL} level...`);
  console.log('🎯 Target: At least 20 minutes reading time');

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
  const readingSpeed = CEFR_LEVEL === 'A1' ? 80 : 100; // words/min
  const estimatedMinutes = Math.round(wordCount / readingSpeed);

  console.log(`\n✅ Simplification complete!`);
  console.log(`📊 Statistics:`);
  console.log(`   - Level: ${CEFR_LEVEL}`);
  console.log(`   - Sentences: ${cache.sentences.length}`);
  console.log(`   - Words: ${wordCount.toLocaleString()}`);
  console.log(`   - Characters: ${charCount.toLocaleString()}`);
  console.log(`   - Estimated reading time: ~${estimatedMinutes} minutes (${CEFR_LEVEL} level)`);
  
  if (estimatedMinutes < 20) {
    console.log(`\n⚠️  WARNING: Story is ${estimatedMinutes} minutes, target is at least 20 minutes.`);
    console.log(`   Consider expanding the story before simplification.`);
  } else {
    console.log(`\n✅ Target met: ${estimatedMinutes} minutes (≥20 minutes)`);
  }
  
  return simplifiedText;
}

if (require.main === module) {
  simplifyStory().catch(console.error);
}

module.exports = { simplifyStory };

