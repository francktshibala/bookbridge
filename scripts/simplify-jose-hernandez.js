#!/usr/bin/env node

/**
 * Simplify José Hernández Biography to A1 level
 * Following Master Mistakes Prevention guidelines
 */

import { config } from 'dotenv';
import fs from 'fs';
import path from 'path';
import https from 'https';

// Load environment variables
config({ path: '.env.local' });

const STORY_ID = 'jose-hernandez';
const VALID_LEVELS = ['A1', 'A2', 'B1'];

// A1 Simplification Guidelines
const A1_GUIDELINES = `
- Use 500-1000 most common words
- Present and simple past tense only
- Natural compound sentences (6-12 words average)
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

// A2 Simplification Guidelines
const A2_GUIDELINES = `
- Use 1200-1500 most common words
- Present and simple past tense
- Natural compound sentences (8-15 words average)
- MAXIMUM 15 WORDS PER SENTENCE (Master Prevention - prevents highlighting issues)
- More connectors: "and", "but", "so", "then", "because"
- Explain cultural references simply
- Maintain exact 1:1 sentence count mapping (CRITICAL)
- Generate compound sentences for natural flow (NOT micro-sentences)
- AVOID: "He was nervous. He was mad. He heard things." (robotic micro-sentences)
- CORRECT A2: "He was very nervous and felt mad because he heard strange things in the dark." (natural 11 words)
- Each sentence should express one complete thought
- Avoid semicolons - use periods instead
- Preserve punctuation for proper formatting
- Validate natural reading flow
`;

// B1 Simplification Guidelines
const B1_GUIDELINES = `
- Use 2000-2500 most common words
- All tenses allowed but keep clear
- Complex sentences with cultural context (12-25 words average)
- MAXIMUM 25 WORDS PER SENTENCE (Master Prevention - prevents highlighting issues)
- More sophisticated connectors: "although", "however", "meanwhile", "therefore"
- Keep some cultural references with brief explanations
- Maintain exact 1:1 sentence count mapping (CRITICAL)
- Generate flowing complex sentences (NOT choppy short ones)
- AVOID: "He was nervous. He was mad. He heard things." (simplified too much)
- CORRECT B1: "He was deeply disturbed and felt increasingly agitated because he heard strange sounds that no one else could perceive." (natural 16 words)
- Each sentence should express one complete thought
- Avoid semicolons - use periods instead
- Preserve original style and nuance where possible
- Maintain emotional depth and literary quality
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
    const guidelines = level === 'A1' ? A1_GUIDELINES : (level === 'A2' ? A2_GUIDELINES : B1_GUIDELINES);
    const wordRange = level === 'A1' ? '500-1000' : (level === 'A2' ? '1200-1500' : '2000-2500');
    const avgWords = level === 'A1' ? '6-12 words average' : (level === 'A2' ? '8-15 words average' : '12-25 words average');
    const maxWords = level === 'A1' ? '12' : (level === 'A2' ? '15' : '25');
    const connectors = level === 'A1' ? '"and", "but", "when" only when natural' : (level === 'A2' ? '"and", "but", "so", "then", "because"' : '"although", "however", "meanwhile", "therefore"');

    const data = JSON.stringify({
      model: 'gpt-4o-mini',
      max_tokens: 150,
      messages: [{
        role: 'user',
        content: `Simplify this sentence to ${level} English level following these rules:

${guidelines}

Original sentence: "${cleanSentence}"

Requirements:
1. Use ${wordRange} most common words only
2. Create natural compound sentences (${avgWords})
3. CRITICAL: Maximum ${maxWords} words per sentence (prevents highlighting issues)
4. Each sentence should express one complete thought
5. Avoid semicolons - use periods instead
6. Use connectors: ${connectors}
7. Keep the complete meaning and emotion
8. Return ONLY the simplified sentence, no explanation

Simplified sentence:`
      }]
    });

    const dataBuffer = Buffer.from(data, 'utf8');

    const options = {
      hostname: 'api.openai.com',
      port: 443,
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': dataBuffer.length,
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      }
    };

    const req = https.request(options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        try {
          if (res.statusCode === 200) {
            const parsed = JSON.parse(responseData);
            if (parsed.error) {
              reject(new Error(parsed.error.message));
              return;
            }
            const simplified = parsed.choices[0].message.content.trim();
            resolve(simplified);
          } else {
            reject(new Error(`OpenAI API error: ${res.statusCode} - ${responseData.substring(0, 200)}`));
          }
        } catch (error) {
          reject(new Error(`Failed to parse response: ${responseData.substring(0, 200)}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(new Error(`Request failed: ${error.message}`));
    });

    req.write(dataBuffer);
    req.end();
  });
}

async function simplifyText(level) {
  if (!VALID_LEVELS.includes(level)) {
    console.error(`❌ Invalid level: ${level}. Valid levels: ${VALID_LEVELS.join(', ')}`);
    process.exit(1);
  }

  const cacheDir = path.join(process.cwd(), 'cache');
  const inputFile = path.join(cacheDir, `${STORY_ID}-cleaned.txt`);
  const outputFile = path.join(cacheDir, `${STORY_ID}-${level}-simplified.txt`);
  const cacheFile = path.join(cacheDir, `${STORY_ID}-${level}-simplified-cache.json`);

  if (!fs.existsSync(inputFile)) {
    console.error(`❌ Input file not found: ${inputFile}`);
    console.log('💡 Run: node scripts/clean-jose-hernandez.js first');
    process.exit(1);
  }

  console.log(`📚 Simplifying José Hernández biography to ${level} level...`);
  console.log(`📖 Input: ${inputFile}`);
  console.log(`💾 Output: ${outputFile}`);
  console.log('');

  // Load text
  const text = fs.readFileSync(inputFile, 'utf8');
  
  // Split into sentences
  const sentences = text.split(/[.!?]+\s+/).filter(s => s.trim().length > 10);
  console.log(`📊 Found ${sentences.length} sentences to simplify`);
  console.log('');

  // Load cache if exists
  let cache = {};
  if (fs.existsSync(cacheFile)) {
    cache = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
    console.log(`💾 Loaded cache: ${Object.keys(cache).length} sentences already simplified`);
  }

  const simplified = [];
  let processed = 0;
  let cached = 0;

  // Process sentences in batches of 10
  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i].trim();
    
    // Skip if already cached
    if (cache[sentence]) {
      simplified.push(cache[sentence]);
      cached++;
      continue;
    }

    try {
      console.log(`[${i + 1}/${sentences.length}] Simplifying...`);
      const simplifiedSentence = await callOpenAI(sentence, level);
      simplified.push(simplifiedSentence);
      cache[sentence] = simplifiedSentence;
      processed++;

      // Save cache every 10 sentences
      if (processed % 10 === 0) {
        fs.writeFileSync(cacheFile, JSON.stringify(cache, null, 2), 'utf8');
        console.log(`💾 Cache saved (${processed} processed, ${cached} cached)`);
      }

      // Small delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error(`❌ Error simplifying sentence ${i + 1}:`, error.message);
      // Use original sentence as fallback
      simplified.push(sentence);
    }
  }

  // Save final cache
  fs.writeFileSync(cacheFile, JSON.stringify(cache, null, 2), 'utf8');

  // Join sentences with proper punctuation
  const simplifiedText = simplified
    .map((s, i) => {
      // Ensure sentence ends with punctuation
      if (!s.match(/[.!?]$/)) {
        return s + '.';
      }
      return s;
    })
    .join(' ');

  // Save simplified text
  fs.writeFileSync(outputFile, simplifiedText, 'utf8');

  console.log('');
  console.log('✅ Simplification complete!');
  console.log(`📄 Output: ${outputFile}`);
  console.log(`📊 Stats:`);
  console.log(`   - Original sentences: ${sentences.length}`);
  console.log(`   - Simplified sentences: ${simplified.length}`);
  console.log(`   - Processed: ${processed}`);
  console.log(`   - Cached: ${cached}`);
  console.log(`   - Characters: ${simplifiedText.length.toLocaleString()}`);
  console.log('');
  console.log('🎯 Next steps:');
  console.log('   1. Review: cat cache/jose-hernandez-A1-simplified.txt');
  console.log('   2. Database seeding: node scripts/seed-jose-hernandez.ts');
  console.log('   3. Preview generation: node scripts/generate-jose-hernandez-preview.js A1');
  console.log('');
}

// Get level from command line
const level = process.argv[2]?.toUpperCase() || 'A1';

if (!VALID_LEVELS.includes(level)) {
  console.error(`❌ Invalid level: ${level}. Valid levels: ${VALID_LEVELS.join(', ')}`);
  process.exit(1);
}

simplifyText(level).catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

