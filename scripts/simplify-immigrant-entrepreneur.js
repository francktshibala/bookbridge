#!/usr/bin/env node

/**
 * Simplify "Immigrant Entrepreneur: From Failure to Success" to specified CEFR level
 * Target: At least 20 minutes reading time
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

const STORY_ID = 'immigrant-entrepreneur';
const CACHE_DIR = path.join(__dirname, '..', 'cache');

// Get target level from command line argument or default to A1
const targetLevel = process.argv[2] || 'A1';
const VALID_LEVELS = ['A1', 'A2'];

if (!VALID_LEVELS.includes(targetLevel)) {
  console.error(`❌ Error: Invalid level "${targetLevel}". Valid levels: ${VALID_LEVELS.join(', ')}`);
  console.log('Usage: node scripts/simplify-immigrant-entrepreneur.js [A1|A2]');
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
- AVOID: "He is sad. He cries. He goes." (robotic micro-sentences)
- CORRECT A1: "He is sad and cries." OR "He is sad. He cries because he feels bad." (natural flow)
- Each sentence should express one complete thought
- Avoid semicolons - use periods instead
- Preserve punctuation for proper formatting
- Keep proper nouns: Carlos, Maria, David, Sofia, etc.
`;

// A2 Simplification Guidelines
const A2_GUIDELINES = `
- Use 1000-2000 most common words
- Present, simple past, and simple future tenses
- Moderate sentences (8-15 words average)
- MAXIMUM 15 WORDS PER SENTENCE
- More connectors: "and", "but", "when", "because", "so", "after", "before"
- Some subordinate clauses allowed
- Basic cultural references with context
- Maintain exact 1:1 sentence count mapping (CRITICAL)
- Generate natural flow sentences
- Each sentence should express one or two related thoughts
- Preserve punctuation for proper formatting
- Keep proper nouns: Carlos, Maria, David, Sofia, etc.
`;

// Select guidelines based on target level
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
3. Use appropriate vocabulary for ${CEFR_LEVEL} level
4. Use connectors to create natural flow within ONE sentence
5. Keep the complete meaning and emotion
6. Keep proper nouns unchanged (Carlos, Maria, etc.)
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
    const words = simplified.split(/\s+/).filter(w => w.length > 0);
    const maxAllowed = MAX_WORDS + 4; // Allow some flexibility
    if (words.length > maxAllowed) {
      console.warn(`   ⚠️  Sentence ${retryCount + 1} has ${words.length} words (max ${maxAllowed} allowed for ${CEFR_LEVEL})`);
    }
    
    return simplified;
  } catch (error) {
    if (retryCount < maxAttempts) {
      console.log(`   ⚠️  Retry ${retryCount + 1}/${maxAttempts}...`);
      await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
      return callOpenAI(sentence, retryCount + 1);
    }
    throw error;
  }
}

async function simplifyStory() {
  console.log(`📖 Simplifying to ${CEFR_LEVEL} level...`);
  console.log('🎯 Target: At least 20 minutes reading time');

  // Load cache if exists
  let cache = {};
  if (fs.existsSync(CACHE_FILE)) {
    cache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'));
    console.log(`📁 Loaded cache: ${Object.keys(cache).length} sentences already simplified`);
  }
  
  // Read original text
  const originalText = fs.readFileSync(INPUT_FILE, 'utf-8');
  
  // Split into sentences
  const sentences = originalText
    .split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.match(/^\*\*/)); // Filter out markdown headers
  
  console.log(`📊 Original: ${sentences.length} sentences`);
  
  const simplifiedSentences = [];
  let processed = 0;
  
  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i];
    
    // Check cache first
    if (cache[sentence]) {
      simplifiedSentences.push(cache[sentence]);
      processed++;
      if (processed % 10 === 0) {
        console.log(`   ✅ Processed ${processed}/${sentences.length} (using cache)`);
      }
      continue;
    }
    
    // Simplify sentence
    try {
      const simplified = await callOpenAI(sentence);
      simplifiedSentences.push(simplified);
      cache[sentence] = simplified;
      processed++;
      
      // Save cache every 10 sentences
      if (processed % 10 === 0) {
        fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
        console.log(`   ✅ Processed ${processed}/${sentences.length} (saved cache)`);
      }
      
      // Small delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 200));
    } catch (error) {
      console.error(`   ❌ Error simplifying sentence ${i + 1}:`, error.message);
      // Use original sentence as fallback
      simplifiedSentences.push(sentence);
    }
  }
  
  // Save final cache
  fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));

  // Combine simplified sentences
  const simplifiedText = simplifiedSentences.join(' ');

  // Save simplified text
  fs.writeFileSync(OUTPUT_FILE, simplifiedText, 'utf-8');

  // Statistics
  const wordCount = simplifiedText.split(/\s+/).length;
  const readingSpeed = CEFR_LEVEL === 'A1' ? 80 : 100; // A1: ~80 wpm, A2: ~100 wpm
  const estimatedMinutes = Math.round(wordCount / readingSpeed);

  console.log(`\n✅ Simplification complete!`);
  console.log(`📊 Statistics:`);
  console.log(`   - Sentences: ${simplifiedSentences.length} (1:1 mapping maintained)`);
  console.log(`   - Words: ${wordCount.toLocaleString()}`);
  console.log(`   - Estimated reading time: ~${estimatedMinutes} minutes (${CEFR_LEVEL} level)`);
  
  if (estimatedMinutes < 20) {
    console.log(`⚠️  WARNING: Story is ${estimatedMinutes} minutes, target is at least 20 minutes.`);
    console.log(`💡 Consider expanding ${CEFR_LEVEL} version to meet target.`);
  } else {
    console.log(`✅ Target met: ${estimatedMinutes} minutes (≥20 minutes)`);
  }

  // Check sentence length distribution
  const wordCounts = simplifiedSentences.map(s => s.split(/\s+/).length);
  const avgWords = Math.round(wordCounts.reduce((a, b) => a + b, 0) / wordCounts.length);
  const maxWords = Math.max(...wordCounts);
  const overLimit = wordCounts.filter(w => w > MAX_WORDS).length;

  console.log(`\n📏 Sentence Length Analysis:`);
  console.log(`   - Average words per sentence: ${avgWords}`);
  console.log(`   - Maximum words: ${maxWords}`);
  console.log(`   - Sentences over ${MAX_WORDS} words: ${overLimit} (${Math.round(overLimit / wordCounts.length * 100)}%)`);

  if (overLimit > wordCounts.length * 0.1) {
    console.log(`⚠️  WARNING: More than 10% of sentences exceed ${MAX_WORDS} words.`);
  }
}

if (require.main === module) {
  simplifyStory().catch(console.error);
}

module.exports = { simplifyStory };

