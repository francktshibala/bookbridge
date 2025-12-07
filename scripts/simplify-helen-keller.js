#!/usr/bin/env node

/**
 * Simplify Helen Keller's "The Story of My Life" (Chapters III-IV) to A1 level
 * Following Master Mistakes Prevention guidelines
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

const BOOK_INFO = {
  id: 'helen-keller',
  inputFile: 'helen-keller-modernized.txt',
  outputFileA1: 'helen-keller-A1-simplified.txt',
  cacheFileA1: 'helen-keller-A1-simplified.json'
};

// A1 Simplification Guidelines
const A1_GUIDELINES = `
- Use 500-1000 most common words
- Present and simple past tense only
- Natural compound sentences (6-12 words average - PROVEN BY MAYA STORY)
- MAXIMUM 12 WORDS PER SENTENCE (Master Prevention - prevents highlighting issues)
- Simple connectors: "and", "but", "when" (use sparingly, only when natural)
- No cultural references or explain very simply
- Maintain exact 1:1 sentence count mapping (CRITICAL)
- Generate natural flow sentences (NOT forced micro-sentences)
- AVOID: "She is sad. She cries. She goes." (robotic micro-sentences)
- CORRECT A1: "She is sad and cries." OR "She is sad. She cries because she feels bad." (natural flow)
- Each sentence should express one complete thought
- Avoid semicolons - use periods instead
- Preserve punctuation for proper formatting
- Validate natural reading flow
- Keep proper nouns: Helen Keller, Anne Sullivan, Dr. Bell, etc.
`;

// SCRIPT LEVEL VALIDATION - MANDATORY FIRST
const VALID_LEVELS = ['A1', 'A2', 'B1'];

// Get target level from command line argument
const targetLevel = process.argv[2];

// Validate level before proceeding
if (!targetLevel) {
  console.error('❌ Error: Please specify a CEFR level (A1, A2, or B1)');
  console.log('Usage: node scripts/simplify-helen-keller.js [A1|A2|B1]');
  process.exit(1);
}

if (!VALID_LEVELS.includes(targetLevel)) {
  console.error(`❌ Error: Invalid level "${targetLevel}". Valid levels: ${VALID_LEVELS.join(', ')}`);
  process.exit(1);
}

const CEFR_LEVEL = targetLevel;

// Helper function to call OpenAI API
async function callOpenAI(sentence, level) {
  const cleanSentence = sentence
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/'/g, "\\'")
    .replace(/\n/g, ' ')
    .replace(/\r/g, ' ')
    .replace(/\t/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const wordRange = level === 'A1' ? '500-1000' : (level === 'A2' ? '1200-1500' : '2000-2500');
  const avgWords = level === 'A1' ? '6-12 words average' : (level === 'A2' ? '11-13 words average' : '15-18 words average');
  const maxWords = level === 'A1' ? '12' : (level === 'A2' ? '15' : '25');
  const connectors = level === 'A1' ? '"and", "but", "when" only when natural' : (level === 'A2' ? '"and", "but", "so", "then", "because"' : '"although", "however", "meanwhile", "therefore"');

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    max_tokens: 200,
    messages: [{
      role: 'user',
      content: `You are simplifying ONE sentence to ${level} level. Return EXACTLY ONE sentence.

${A1_GUIDELINES}

Original sentence: "${cleanSentence}"

CRITICAL RULES:
1. Return EXACTLY ONE sentence (not two or three sentences)
2. Maximum ${maxWords} words total - if too long, use connectors to combine ideas into ONE sentence
3. Use ${wordRange} most common words only
4. Use connectors: ${connectors} to create natural flow within ONE sentence
5. Keep the complete meaning and emotion
6. Keep proper nouns unchanged (Helen Keller, Anne Sullivan, Dr. Bell, etc.)
7. Return ONLY the simplified sentence, no explanation, no quotes, no period at end if you add one

Example: If original is "I was sad. I cried. I felt bad." → Return ONE sentence: "I was sad and cried because I felt bad."

Simplified sentence:`
    }]
  });

  const simplified = response.choices[0].message.content.trim();

  // Remove quotes if AI wrapped the response
  return simplified.replace(/^["']|["']$/g, '');
}

function splitIntoSentences(text) {
  // Split by sentence-ending punctuation, but preserve the punctuation
  const sentences = text.match(/[^.!?]*[.!?]+/g) || [];
  return sentences.map(s => s.trim()).filter(s => s.length > 0);
}

async function simplifyHelenKeller() {
  console.log(`📚 Simplifying Helen Keller's "The Story of My Life" to ${CEFR_LEVEL} level...`);

  const cacheDir = path.join(__dirname, '..', 'cache');
  const inputPath = path.join(cacheDir, BOOK_INFO.inputFile);
  const outputPath = path.join(cacheDir, BOOK_INFO[`outputFile${CEFR_LEVEL}`]);
  const cachePath = path.join(cacheDir, BOOK_INFO[`cacheFile${CEFR_LEVEL}`]);

  // Check for cached results
  let cachedSentences = [];
  if (fs.existsSync(cachePath) && !process.argv.includes('--fresh')) {
    console.log('💾 Loading cached progress...');
    try {
      const cacheData = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
      cachedSentences = cacheData.sentences || [];
      console.log(`✅ Loaded ${cachedSentences.length} cached sentences`);
    } catch (error) {
      console.log('⚠️ Cache file corrupted, starting fresh');
    }
  }

  // Read modernized text
  const modernizedText = fs.readFileSync(inputPath, 'utf8');
  const sentences = splitIntoSentences(modernizedText);
  console.log(`📖 Found ${sentences.length} sentences to simplify`);

  // Process sentences
  const simplifiedSentences = [...cachedSentences];
  const startIndex = cachedSentences.length;

  console.log(`\n🔄 Processing sentences ${startIndex + 1} to ${sentences.length}...`);

  for (let i = startIndex; i < sentences.length; i++) {
    let sentence = sentences[i].trim();

    // Handle chapter headers
    if (sentence.match(/^CHAPTER [IVX]+$/i)) {
      simplifiedSentences.push(sentence);
      continue;
    }

    if (sentence.length < 10) {
      // Skip very short sentences
      simplifiedSentences.push(sentence);
      continue;
    }

    console.log(`\n📝 Processing sentence ${i + 1}/${sentences.length}`);
    console.log(`Original: ${sentence.substring(0, 80)}...`);

    try {
      const simplified = await callOpenAI(sentence, CEFR_LEVEL);
      const wordCount = simplified.split(/\s+/).length;
      const maxLimit = CEFR_LEVEL === 'A1' ? 12 : (CEFR_LEVEL === 'A2' ? 15 : 25);

      console.log(`✅ Simplified: ${simplified.substring(0, 80)}...`);
      console.log(`📊 Word count: ${wordCount} words (max: ${maxLimit})`);

      if (wordCount > maxLimit) {
        console.log(`⚠️ Warning: Sentence exceeds ${maxLimit} word limit`);
      }

      simplifiedSentences.push(simplified);

      // Save progress after every sentence
      const cacheData = {
        sentences: simplifiedSentences,
        processedAt: new Date().toISOString(),
        totalSentences: sentences.length,
        completedSentences: simplifiedSentences.length
      };
      fs.writeFileSync(cachePath, JSON.stringify(cacheData, null, 2), 'utf8');

      // Small delay to be respectful to API
      await new Promise(resolve => setTimeout(resolve, 500));

    } catch (error) {
      console.error(`❌ Error processing sentence ${i + 1}:`, error.message);
      throw error;
    }
  }

  // Combine simplified sentences
  const simplifiedText = simplifiedSentences.join(' ');

  // Save final output
  fs.writeFileSync(outputPath, simplifiedText, 'utf8');

  const wordCount = simplifiedText.split(/\s+/).length;
  const originalWordCount = modernizedText.split(/\s+/).length;

  console.log(`\n✅ Simplification complete!`);
  console.log(`📁 Saved to: ${outputPath}`);
  console.log(`📊 Statistics:`);
  console.log(`   - Original words: ${originalWordCount.toLocaleString()}`);
  console.log(`   - Simplified words: ${wordCount.toLocaleString()}`);
  console.log(`   - Sentences: ${simplifiedSentences.length}`);
  console.log(`   - Estimated reading time: ~${Math.round(wordCount / 200)} minutes`);
}

if (require.main === module) {
  simplifyHelenKeller().catch(console.error);
}

module.exports = { simplifyHelenKeller };

