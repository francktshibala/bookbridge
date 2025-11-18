#!/usr/bin/env node

/**
 * Simplify "The Last Leaf" to B1 level
 * Following Master Mistakes Prevention guidelines
 */

import { config } from 'dotenv';
import fs from 'fs';
import path from 'path';
import https from 'https';

// Load environment variables
config({ path: '.env.local' });

const BOOK_INFO = {
  id: 'the-last-leaf',
  inputFile: 'the-last-leaf-original.txt',
  outputFileB1: 'the-last-leaf-B1-simplified.txt'
};

// B1 Simplification Guidelines
const B1_GUIDELINES = `
- Use 2000-2500 most common words
- All tenses allowed but keep clear
- Complex sentences with cultural context (15-18 words average)
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
    const guidelines = B1_GUIDELINES;
    const wordRange = '2000-2500';
    const avgWords = '15-18 words average';
    const maxWords = '25';
    const connectors = '"although", "however", "meanwhile", "therefore"';

    const payload = {
      model: 'gpt-4o-mini',
      max_tokens: 200,
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
    };

    const data = JSON.stringify(payload);

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

          if (res.statusCode === 200) {
            resolve(parsed.choices[0].message.content.trim());
          } else {
            reject(new Error(`OpenAI API error: ${res.statusCode} - ${JSON.stringify(parsed)}`));
          }
        } catch (error) {
          reject(new Error(`Failed to parse response: ${responseData}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(new Error(`Request failed: ${error.message}`));
    });

    req.write(data);
    req.end();
  });
}

// Main simplification function
async function simplifyLastLeaf(level) {
  const cacheDir = path.join(process.cwd(), 'cache');
  const inputPath = path.join(cacheDir, BOOK_INFO.inputFile);
  const outputPath = path.join(cacheDir, BOOK_INFO.outputFileB1);
  const outputJsonPath = path.join(cacheDir, `the-last-leaf-B1-simplified.json`);

  // Check if input file exists
  if (!fs.existsSync(inputPath)) {
    throw new Error(`Input file not found: ${inputPath}. Run fetch script first.`);
  }

  console.log(`📖 Simplifying "The Last Leaf" to ${level} level...`);
  console.log(`📂 Input: ${inputPath}`);
  console.log(`📂 Output: ${outputPath}`);

  // Read original text
  const originalText = fs.readFileSync(inputPath, 'utf8');

  // Split into sentences (preserve punctuation)
  const sentenceRegex = /([^.!?]*[.!?]+)/g;
  const originalSentences = originalText.match(sentenceRegex) || [];
  
  console.log(`📝 Found ${originalSentences.length} sentences to simplify`);

  // Check if we have cached progress
  let simplifiedSentences = [];
  let startIndex = 0;

  if (fs.existsSync(outputJsonPath)) {
    const cached = JSON.parse(fs.readFileSync(outputJsonPath, 'utf8'));
    if (cached.sentences && cached.sentences.length > 0) {
      simplifiedSentences = cached.sentences;
      startIndex = simplifiedSentences.length;
      console.log(`📦 Resuming from cache: ${startIndex} sentences already simplified`);
    }
  }

  // Simplify remaining sentences
  for (let i = startIndex; i < originalSentences.length; i++) {
    const originalSentence = originalSentences[i].trim();
    
    if (!originalSentence) {
      simplifiedSentences.push({ sentenceIndex: i, text: '' });
      continue;
    }

    try {
      console.log(`\n[${i + 1}/${originalSentences.length}] Simplifying...`);
      console.log(`Original: ${originalSentence.substring(0, 80)}...`);

      const simplified = await callOpenAI(originalSentence, level);
      
      // Validate sentence count (must be 1:1)
      const simplifiedCount = simplified.split(/[.!?]+/).filter(s => s.trim().length > 5).length;
      if (simplifiedCount !== 1) {
        console.warn(`⚠️ Warning: Simplified sentence may have multiple sentences. Count: ${simplifiedCount}`);
      }

      simplifiedSentences.push({
        sentenceIndex: i,
        text: simplified.trim()
      });

      console.log(`✅ Simplified: ${simplified.substring(0, 80)}...`);

      // Save progress after every sentence
      fs.writeFileSync(outputJsonPath, JSON.stringify({
        bookId: BOOK_INFO.id,
        level: level,
        sentences: simplifiedSentences,
        totalSentences: originalSentences.length,
        lastUpdated: new Date().toISOString()
      }, null, 2));

      // Rate limiting: wait 100ms between requests
      await new Promise(resolve => setTimeout(resolve, 100));

    } catch (error) {
      console.error(`❌ Error simplifying sentence ${i + 1}:`, error.message);
      throw error;
    }
  }

  // Validate sentence count matches
  if (simplifiedSentences.length !== originalSentences.length) {
    throw new Error(`Sentence count mismatch: ${simplifiedSentences.length} simplified vs ${originalSentences.length} original`);
  }

  // Combine into full text
  const simplifiedText = simplifiedSentences.map(s => s.text).join(' ');

  // Save simplified text
  fs.writeFileSync(outputPath, simplifiedText, 'utf8');

  console.log(`\n✅ Simplification complete!`);
  console.log(`📊 Statistics:`);
  console.log(`   Original sentences: ${originalSentences.length}`);
  console.log(`   Simplified sentences: ${simplifiedSentences.length}`);
  console.log(`   Original words: ${originalText.split(/\s+/).length}`);
  console.log(`   Simplified words: ${simplifiedText.split(/\s+/).length}`);
  console.log(`💾 Saved to: ${outputPath}`);
  console.log(`💾 JSON saved to: ${outputJsonPath}`);

  return {
    sentences: simplifiedSentences,
    text: simplifiedText,
    filePath: outputPath
  };
}

// Run if called directly
const targetLevel = process.argv[2] || 'B1';

if (targetLevel !== 'B1') {
  console.error('❌ Error: This script only supports B1 level');
  process.exit(1);
}

simplifyLastLeaf(targetLevel)
  .then(() => console.log('\n✅ The Last Leaf simplified successfully!'))
  .catch(error => {
    console.error('\n❌ Failed to simplify The Last Leaf:', error.message);
    process.exit(1);
  });

export { simplifyLastLeaf };

