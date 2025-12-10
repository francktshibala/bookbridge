#!/usr/bin/env node

/**
 * Simplify "Community Builder #2" to A1 level
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

const STORY_ID = 'community-builder-2';
const CACHE_DIR = path.join(__dirname, '..', 'cache');

const INPUT_FILE = path.join(CACHE_DIR, `${STORY_ID}-A1-original.txt`);
const OUTPUT_FILE_A1 = path.join(CACHE_DIR, `${STORY_ID}-A1-simplified.txt`);
const CACHE_FILE_A1 = path.join(CACHE_DIR, `${STORY_ID}-A1-simplified.json`);

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
- Keep proper nouns: Layla, etc.
`;

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
        content: `You are simplifying ONE sentence to A1 level. Return EXACTLY ONE sentence.

${A1_GUIDELINES}

Original sentence: "${cleanSentence}"

CRITICAL RULES:
1. Return EXACTLY ONE sentence (not two or three sentences)
2. Maximum 12 words total - if too long, use connectors to combine ideas into ONE sentence
3. Use 500-1000 most common words only
4. Use connectors: "and", "but", "when" to create natural flow within ONE sentence
5. Keep the complete meaning and emotion
6. Keep proper nouns unchanged (Layla, etc.)
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
    if (words > 12 && retryCount < maxAttempts) {
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
async function simplifyToA1() {
  console.log('📝 Simplifying Community Builder #2 to A1 level...');
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
  if (fs.existsSync(CACHE_FILE_A1)) {
    cache = JSON.parse(fs.readFileSync(CACHE_FILE_A1, 'utf-8'));
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
        fs.writeFileSync(CACHE_FILE_A1, JSON.stringify(cache, null, 2), 'utf-8');
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
  fs.writeFileSync(OUTPUT_FILE_A1, simplifiedText, 'utf-8');
  fs.writeFileSync(CACHE_FILE_A1, JSON.stringify(cache, null, 2), 'utf-8');
  
  // Calculate statistics
  const wordCount = simplifiedText.split(/\s+/).length;
  const charCount = simplifiedText.length;
  const estimatedMinutes = Math.round(wordCount / 80); // A1 reading speed ~80 words/min
  
  console.log(`\n✅ Simplification complete!`);
  console.log(`📊 Statistics:`);
  console.log(`   - Sentences: ${cache.sentences.length}`);
  console.log(`   - Words: ${wordCount.toLocaleString()}`);
  console.log(`   - Characters: ${charCount.toLocaleString()}`);
  console.log(`   - Estimated reading time: ~${estimatedMinutes} minutes (A1 level)`);
  
  if (estimatedMinutes < 20) {
    console.log(`\n⚠️  WARNING: Story is ${estimatedMinutes} minutes, target is at least 20 minutes.`);
    console.log(`   Consider expanding the story before simplification.`);
  } else {
    console.log(`\n✅ Target met: ${estimatedMinutes} minutes (≥20 minutes)`);
  }
  
  return simplifiedText;
}

if (require.main === module) {
  simplifyToA1().catch(console.error);
}

module.exports = { simplifyToA1 };

