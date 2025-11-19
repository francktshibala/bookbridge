#!/usr/bin/env node

/**
 * Simplify "After Twenty Years" to A1 level
 * Following Master Mistakes Prevention guidelines
 */

import { config } from 'dotenv';
import fs from 'fs';
import path from 'path';
import https from 'https';

// Load environment variables
config({ path: '.env.local' });

const BOOK_INFO = {
  id: 'after-twenty-years',
  inputFile: 'after-twenty-years-original.txt',
  outputFileA1: 'after-twenty-years-A1-simplified.txt'
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

    const options = {
      hostname: 'api.openai.com',
      port: 443,
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
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
          const parsed = JSON.parse(responseData);
          if (parsed.error) {
            reject(new Error(`OpenAI API error: ${parsed.error.message}`));
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

async function simplifyAfterTwentyYears(level = 'A1') {
  const cacheDir = path.join(process.cwd(), 'cache');
  const inputPath = path.join(cacheDir, BOOK_INFO.inputFile);
  const outputPath = path.join(cacheDir, BOOK_INFO.outputFileA1);
  const jsonPath = path.join(cacheDir, `after-twenty-years-${level}-simplified.json`);

  // Check if already simplified
  if (fs.existsSync(outputPath) && fs.existsSync(jsonPath)) {
    console.log(`✅ Already simplified to ${level}. Loading from cache...`);
    const cached = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    console.log(`   Loaded ${cached.sentences.length} sentences`);
    return cached;
  }

  if (!fs.existsSync(inputPath)) {
    throw new Error(`Original text not found: ${inputPath}`);
  }

  console.log(`📖 Simplifying "After Twenty Years" to ${level} level...`);
  console.log(`   Input: ${inputPath}`);
  console.log(`   Output: ${outputPath}`);

  const originalText = fs.readFileSync(inputPath, 'utf8');
  
  // Split into sentences (preserving punctuation)
  const sentences = originalText.match(/[^.!?]*[.!?]+/g) || [];
  console.log(`   Found ${sentences.length} sentences to simplify`);

  const simplifiedSentences = [];
  let processedCount = 0;

  // Resume from cache if exists
  if (fs.existsSync(jsonPath)) {
    const cached = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    simplifiedSentences.push(...cached.sentences);
    processedCount = cached.sentences.length;
    console.log(`   Resuming from cache: ${processedCount} sentences already processed`);
  }

  // Process remaining sentences
  for (let i = processedCount; i < sentences.length; i++) {
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
  const result = {
    level,
    totalSentences: sentences.length,
    sentences: simplifiedSentences,
    simplifiedText,
    wordCount: simplifiedText.split(/\s+/).length,
    generatedAt: new Date().toISOString()
  };
  fs.writeFileSync(jsonPath, JSON.stringify(result, null, 2));
  console.log(`   💾 Saved JSON metadata: ${jsonPath}`);

  console.log(`\n✅ Simplification complete!`);
  console.log(`   📝 Sentences: ${sentences.length}`);
  console.log(`   📖 Words: ${result.wordCount}`);
  console.log(`   📄 Level: ${level}`);

  return result;
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const level = process.argv[2] || 'A1';
  simplifyAfterTwentyYears(level)
    .then(() => console.log('\n✅ After Twenty Years simplified successfully!'))
    .catch(console.error);
}

export { simplifyAfterTwentyYears };

