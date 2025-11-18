#!/usr/bin/env node

/**
 * Simplify "The Tell-Tale Heart" to A1 level
 * Following Master Mistakes Prevention guidelines
 */

import { config } from 'dotenv';
import fs from 'fs';
import path from 'path';
import https from 'https';

// Load environment variables
config({ path: '.env.local' });

const BOOK_INFO = {
  id: 'tell-tale-heart',
  inputFile: 'tell-tale-heart-original.txt',
  outputFileA1: 'tell-tale-heart-A1-simplified.txt',
  outputFileA2: 'tell-tale-heart-A2-simplified.txt'
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

// A2 Simplification Guidelines
const A2_GUIDELINES = `
- Use 1200-1500 most common words
- Present and simple past tense
- Natural compound sentences (11-13 words average - COMPOUND FLOW)
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
    const guidelines = level === 'A1' ? A1_GUIDELINES : A2_GUIDELINES;
    const wordRange = level === 'A1' ? '500-1000' : '1200-1500';
    const avgWords = level === 'A1' ? '8-12 words average' : '11-13 words average';
    const maxWords = level === 'A1' ? '12' : '15';
    const connectors = level === 'A1' ? '"and", "but", "when" only when natural' : '"and", "but", "so", "then", "because"';

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
        'Content-Length': data.length,
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

async function simplifyTellTaleHeart(level = 'A1') {
  console.log(`💎 Simplifying "The Tell-Tale Heart" to ${level} level...`);

  try {
    // Read the original text
    const cacheDir = path.join(process.cwd(), 'cache');
    const inputPath = path.join(cacheDir, BOOK_INFO.inputFile);

    if (!fs.existsSync(inputPath)) {
      throw new Error(`Input file not found: ${inputPath}`);
    }

    const rawText = fs.readFileSync(inputPath, 'utf-8');
    console.log(`📖 Loaded ${rawText.length} characters`);

    // Split into sentences (maintaining exact count for 1:1 mapping)
    const sentences = rawText.match(/[^.!?]*[.!?]/g) || [];
    console.log(`📊 Processing ${sentences.length} sentences`);

    // Check if pilot mode is requested via command line
    const isPilot = process.argv.includes('--pilot');
    const PILOT_SIZE = 20;
    const sentencesToProcess = isPilot ? sentences.slice(0, PILOT_SIZE) : sentences;

    if (isPilot) {
      console.log(`🧪 PILOT MODE: Processing first ${PILOT_SIZE} sentences for testing`);
    } else {
      console.log(`🚀 FULL MODE: Processing all ${sentences.length} sentences`);
    }

    const simplifiedSentences = [];
    let totalCost = 0;

    for (let i = 0; i < sentencesToProcess.length; i++) {
      const sentence = sentencesToProcess[i].trim();

      if (sentence.length < 10) {
        // Skip very short sentences
        simplifiedSentences.push(sentence);
        continue;
      }

      console.log(`\n📝 Processing sentence ${i + 1}/${sentencesToProcess.length} (${level})`);
      console.log(`Original: ${sentence.substring(0, 100)}${sentence.length > 100 ? '...' : ''}`);

      try {
        const simplified = await callOpenAI(sentence, level);
        console.log(`✅ Simplified: ${simplified.substring(0, 100)}${simplified.length > 100 ? '...' : ''}`);
        
        simplifiedSentences.push(simplified);
        totalCost += 0.0015; // $0.0015 per sentence (gpt-4o-mini)

        // Save progress after every 10 sentences
        if ((i + 1) % 10 === 0) {
          const progressCache = {
            sentences: simplifiedSentences,
            metadata: {
              bookId: BOOK_INFO.id,
              cefrLevel: level,
              inProgress: true,
              savedAt: new Date().toISOString()
            }
          };
          const progressPath = path.join(cacheDir, `${BOOK_INFO.id}-${level}-progress.json`);
          fs.writeFileSync(progressPath, JSON.stringify(progressCache, null, 2));
          console.log(`💾 Progress saved (${i + 1}/${sentencesToProcess.length} sentences)`);
        }

        // Rate limiting: wait 100ms between requests
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        console.error(`❌ Error simplifying sentence ${i + 1}:`, error.message);
        // Use original sentence as fallback
        simplifiedSentences.push(sentence);
      }
    }

    // Validate sentence count (CRITICAL for 1:1 mapping)
    if (simplifiedSentences.length !== sentencesToProcess.length) {
      throw new Error(`❌ FAILED: Expected ${sentencesToProcess.length} sentences, got ${simplifiedSentences.length}`);
    }

    // Join simplified sentences
    const simplifiedText = simplifiedSentences.join(' ');

    // Save to cache
    const outputFile = level === 'A1' ? BOOK_INFO.outputFileA1 : BOOK_INFO.outputFileA2;
    const outputPath = path.join(cacheDir, outputFile);
    fs.writeFileSync(outputPath, simplifiedText, 'utf-8');
    console.log(`\n💾 Saved simplified text to: ${outputPath}`);

    // Save as JSON for bundle generation
    const jsonOutput = {
      bookId: BOOK_INFO.id,
      cefrLevel: level,
      sentences: simplifiedSentences.map((text, index) => ({
        sentenceIndex: index,
        text: text.trim()
      })),
      metadata: {
        originalSentenceCount: sentences.length,
        simplifiedSentenceCount: simplifiedSentences.length,
        wordCount: simplifiedText.split(/\s+/).length,
        generatedAt: new Date().toISOString()
      }
    };

    const jsonPath = path.join(cacheDir, `${BOOK_INFO.id}-${level}-simplified.json`);
    fs.writeFileSync(jsonPath, JSON.stringify(jsonOutput, null, 2));
    console.log(`💾 Saved JSON to: ${jsonPath}`);

    console.log('\n📊 Simplification Summary:');
    console.log(`   Original sentences: ${sentences.length}`);
    console.log(`   Simplified sentences: ${simplifiedSentences.length}`);
    console.log(`   Word count: ${simplifiedText.split(/\s+/).length}`);
    console.log(`   Estimated cost: $${totalCost.toFixed(2)}`);

    return {
      text: simplifiedText,
      sentences: simplifiedSentences,
      filePath: outputPath,
      jsonPath: jsonPath
    };

  } catch (error) {
    console.error('❌ Failed to simplify The Tell-Tale Heart:', error.message);
    throw error;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const level = process.argv[2] || 'A1';
  simplifyTellTaleHeart(level)
    .then(() => console.log('\n✅ The Tell-Tale Heart simplified successfully!'))
    .catch(error => {
      console.error('\n❌ Failed:', error.message);
      process.exit(1);
    });
}

export { simplifyTellTaleHeart };

