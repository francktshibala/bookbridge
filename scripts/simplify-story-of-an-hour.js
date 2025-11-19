#!/usr/bin/env node

/**
 * Simplify "The Story of an Hour" to A1 level
 * Following Master Mistakes Prevention guidelines
 * Voice: Jane (RILOU7YmBhvwJGDGjNmP) - User requested Jane for A1
 */

import { config } from 'dotenv';
import fs from 'fs';
import path from 'path';
import https from 'https';

// Load environment variables
config({ path: '.env.local' });

const BOOK_INFO = {
  id: 'story-of-an-hour',
  inputFile: 'story-of-an-hour-original.txt',
  outputFileA1: 'story-of-an-hour-A1-simplified.txt'
};

// A1 Simplification Guidelines
const A1_GUIDELINES = `
- Use 500-1000 most common words
- Present and simple past tense only
- Natural compound sentences (8-12 words average - PROVEN BY MAYA STORY)
- MAXIMUM 12 WORDS PER SENTENCE (Master Prevention - prevents highlighting issues)
- Simple connectors: "and", "but", "when" (use sparingly, only when natural)
- No cultural references or explain very simply
- Maintain exact 1:1 sentence count mapping (CRITICAL)
- Generate natural flow sentences (NOT forced micro-sentences)
- AVOID: "He is nervous. He is mad. He hears things." (robotic micro-sentences)
- CORRECT A1: "He is nervous and feels mad because he hears strange things." (natural flow)
- Each sentence should express one complete thought
- Avoid semicolons - use periods instead
- Preserve punctuation for proper formatting
- Validate natural reading flow
`;

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
    .trim();
}

// Helper function to call OpenAI API
async function callOpenAI(sentence, level) {
  return new Promise((resolve, reject) => {
    const cleanSentence = cleanSentenceForAPI(sentence);
    const guidelines = A1_GUIDELINES;
    const wordRange = '500-1000';
    const avgWords = '8-12 words average';
    const maxWords = '12';
    const connectors = '"and", "but", "when" only when natural';

    const prompt = `Simplify this English sentence to ${level} CEFR level for ESL learners.

ORIGINAL SENTENCE: "${cleanSentence}"

SIMPLIFICATION GUIDELINES:
${guidelines}

REQUIREMENTS:
- Use only ${wordRange} most common words
- ${avgWords}
- Maximum ${maxWords} words per sentence
- Use simple connectors: ${connectors}
- Maintain the same meaning and emotional tone
- Keep it natural and flowing (NOT robotic micro-sentences)
- Return ONLY the simplified sentence, no explanations

SIMPLIFIED SENTENCE:`;

    const data = JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are an expert ESL teacher simplifying English texts to A1 level. Always maintain natural flow and avoid robotic micro-sentences.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 200
    });

    const options = {
      hostname: 'api.openai.com',
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Length': Buffer.byteLength(data)
      }
    };

    const req = https.request(options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseData);
          if (parsed.error) {
            reject(new Error(`OpenAI API error: ${parsed.error.message}`));
            return;
          }
          if (!parsed.choices || !parsed.choices[0] || !parsed.choices[0].message) {
            reject(new Error('Invalid OpenAI API response structure'));
            return;
          }
          const simplified = parsed.choices[0].message.content.trim();
          resolve(simplified);
        } catch (error) {
          reject(new Error(`Failed to parse OpenAI response: ${error.message}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(new Error(`OpenAI API request failed: ${error.message}`));
    });

    req.write(data);
    req.end();
  });
}

async function simplifyStoryOfAnHour(level = 'A1') {
  const cacheDir = path.join(process.cwd(), 'cache');
  const inputPath = path.join(cacheDir, BOOK_INFO.inputFile);
  const outputFile = BOOK_INFO.outputFileA1;
  const outputPath = path.join(cacheDir, outputFile);
  const jsonPath = path.join(cacheDir, `story-of-an-hour-${level}-simplified.json`);

  // Check if already simplified
  if (fs.existsSync(outputPath) && fs.existsSync(jsonPath)) {
    console.log(`✅ Already simplified to ${level}. Loading from cache...`);
    const cached = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    console.log(`   📝 Cached: ${cached.sentences?.length || cached.simplifiedSentences?.length || 'unknown'} sentences`);
    return cached;
  }

  console.log(`📖 Simplifying "The Story of an Hour" to ${level} level...`);
  console.log(`   Input: ${inputPath}`);
  console.log(`   Output: ${outputPath}`);

  const originalText = fs.readFileSync(inputPath, 'utf8');
  
  // Split into sentences (preserve punctuation)
  const sentences = originalText.match(/[^.!?]*[.!?]+/g) || [];
  console.log(`   Found ${sentences.length} sentences to simplify`);

  // Check for cached progress
  let simplifiedSentences = [];
  let startIndex = 0;
  
  if (fs.existsSync(jsonPath)) {
    try {
      const cached = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
      if (cached.sentences && Array.isArray(cached.sentences)) {
        simplifiedSentences = cached.sentences;
        startIndex = simplifiedSentences.length;
        console.log(`   📂 Resuming from cache: ${startIndex}/${sentences.length} sentences already simplified`);
      }
    } catch (error) {
      console.log(`   ⚠️ Could not load cache, starting fresh`);
    }
  }

  // Simplify remaining sentences
  for (let i = startIndex; i < sentences.length; i++) {
    const sentence = sentences[i].trim();
    if (!sentence) continue;

    try {
      console.log(`   Simplifying sentence ${i + 1}/${sentences.length}...`);
      const simplified = await callOpenAI(sentence, level);
      
      simplifiedSentences.push({
        original: sentence,
        simplified: simplified,
        index: i
      });

      // Save progress every 10 sentences
      if ((i + 1) % 10 === 0) {
        const progress = {
          level,
          totalSentences: sentences.length,
          sentences: simplifiedSentences,
          lastProcessed: i
        };
        fs.writeFileSync(jsonPath, JSON.stringify(progress, null, 2));
        console.log(`   💾 Progress saved: ${i + 1}/${sentences.length}`);
      }

      // Small delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error(`   ❌ Error simplifying sentence ${i + 1}:`, error.message);
      throw error;
    }
  }

  // Combine simplified sentences
  const simplifiedText = simplifiedSentences.map(s => s.simplified).join(' ');

  // Save simplified text
  fs.writeFileSync(outputPath, simplifiedText, 'utf8');
  console.log(`   💾 Saved simplified text: ${outputPath}`);

  // Save JSON with metadata
  const metadata = {
    level,
    totalSentences: sentences.length,
    simplifiedSentences: simplifiedSentences.length,
    sentences: simplifiedSentences,
    wordCount: simplifiedText.split(/\s+/).length,
    savedAt: new Date().toISOString()
  };
  fs.writeFileSync(jsonPath, JSON.stringify(metadata, null, 2));
  console.log(`   💾 Saved JSON metadata: ${jsonPath}`);

  console.log(`\n✅ Simplification complete!`);
  console.log(`   📝 Sentences: ${sentences.length}`);
  console.log(`   📖 Words: ${metadata.wordCount}`);
  console.log(`   📄 Level: ${level}`);

  return metadata;
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const level = process.argv[2] || 'A1';
  
  if (level !== 'A1') {
    console.error(`❌ Error: This script currently only supports A1 level`);
    process.exit(1);
  }

  simplifyStoryOfAnHour(level)
    .then(() => {
      console.log('\n✅ The Story of an Hour simplified successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Simplification failed:', error);
      process.exit(1);
    });
}

export default simplifyStoryOfAnHour;

