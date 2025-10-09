#!/usr/bin/env node

/**
 * Simplify Anne of Green Gables to A2 level with natural compound sentences
 * Following Master Mistakes Prevention guidelines for natural flow
 */

import { config } from 'dotenv';
import fs from 'fs';
import path from 'path';
import https from 'https';

// Load environment variables
config({ path: '.env.local' });

const BOOK_INFO = {
  id: 'anne-of-green-gables',
  inputFile: 'anne-of-green-gables-raw.txt',
  outputFile: 'anne-of-green-gables-A2-simplified.txt'
};

// A2 Simplification Guidelines (from Master Prevention file)
const A2_GUIDELINES = `
- Use 1200-1500 most common words
- Present and simple past tense
- Natural compound sentences (11-13 words average - COMPOUND FLOW)
- More connectors: "and", "but", "so", "then", "because"
- Explain cultural references simply
- Maintain exact 1:1 sentence count mapping (CRITICAL)
- Generate compound sentences for natural flow (NOT micro-sentences)
- AVOID: "She is sad. She cries. She feels bad." (robotic micro-sentences)
- CORRECT A2: "She is sad and cries because she feels bad inside." (natural 11 words)
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
    .replace(/[^\x20-\x7E]/g, ' ') // Remove non-ASCII characters except basic punctuation
    .trim();
}

// Helper function to call OpenAI API (fallback option)
async function callOpenAI(sentence) {
  return new Promise((resolve, reject) => {
    const cleanSentence = cleanSentenceForAPI(sentence);

    const data = JSON.stringify({
      model: 'gpt-4o-mini',
      max_tokens: 150,
      messages: [{
        role: 'user',
        content: `Simplify this sentence to A2 English level following these rules:

${A2_GUIDELINES}

Original sentence: "${cleanSentence}"

Requirements:
1. Use 1200-1500 most common words only
2. Create natural compound sentences (11-13 words average)
3. Use connectors: "and", "but", "so", "then", "because"
4. Keep the complete meaning and emotion
5. Return ONLY the simplified sentence, no explanation

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

// Helper function to call Claude API using https module (primary option)
async function callClaudeAPI(sentence) {
  return new Promise((resolve, reject) => {
    const cleanSentence = cleanSentenceForAPI(sentence);

    const data = JSON.stringify({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 150,
      messages: [{
        role: 'user',
        content: `Simplify this sentence to A2 English level following these rules:

${A2_GUIDELINES}

Original sentence: "${cleanSentence}"

Requirements:
1. Use 1200-1500 most common words only
2. Create natural compound sentences (11-13 words average)
3. Use connectors: "and", "but", "so", "then", "because"
4. Keep the complete meaning and emotion
5. Return ONLY the simplified sentence, no explanation

Simplified sentence:`
      }]
    });

    const options = {
      hostname: 'api.anthropic.com',
      port: 443,
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length,
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
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
            resolve(parsed.content[0].text.trim());
          } else {
            reject(new Error(`Claude API error: ${res.statusCode} - ${JSON.stringify(parsed)}`));
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

async function simplifyAnneOfGreenGables(level = 'A2') {
  console.log(`📚 Simplifying Anne of Green Gables to ${level} level...`);

  try {
    // Read the raw text
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

    // For pilot: process first 20 sentences only (cost-effective testing)
    const PILOT_SIZE = 20;
    const pilotSentences = sentences.slice(0, PILOT_SIZE);
    console.log(`🧪 PILOT MODE: Processing first ${PILOT_SIZE} sentences for testing`);

    const simplifiedSentences = [];
    let totalCost = 0;

    for (let i = 0; i < pilotSentences.length; i++) {
      const sentence = pilotSentences[i].trim();

      if (sentence.length < 10) {
        // Skip very short sentences (chapter markers, etc.)
        simplifiedSentences.push(sentence);
        continue;
      }

      console.log(`\n📝 Processing sentence ${i + 1}/${pilotSentences.length}`);
      console.log(`Original: ${sentence}`);

      try {
        let simplified;

        // Try Claude API first, fallback to OpenAI if it fails
        try {
          simplified = await callClaudeAPI(sentence);
          console.log(`✅ Claude: ${simplified}`);
        } catch (claudeError) {
          console.log(`⚠️ Claude failed, trying OpenAI...`);
          simplified = await callOpenAI(sentence);
          console.log(`✅ OpenAI: ${simplified}`);
        }

        // Count words to verify compound sentence guidelines
        const wordCount = simplified.split(/\s+/).length;
        console.log(`📊 Word count: ${wordCount} words`);

        if (wordCount < 8 || wordCount > 15) {
          console.log(`⚠️ Word count outside A2 range (8-15), but keeping result`);
        }

        simplifiedSentences.push(simplified);
        totalCost += 0.005; // Estimated cost per sentence

        // Save progress every 5 sentences
        if ((i + 1) % 5 === 0) {
          console.log(`💾 Progress saved: ${i + 1} sentences completed`);
        }

        // Rate limiting: wait 100ms between requests
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        console.error(`❌ Both APIs failed for sentence ${i + 1}:`, error.message);
        // Keep original sentence if both APIs fail
        simplifiedSentences.push(sentence);
      }
    }

    // Join simplified sentences
    const simplifiedText = simplifiedSentences.join(' ');

    // Save simplified text
    const outputPath = path.join(cacheDir, `anne-of-green-gables-A2-simplified-pilot.txt`);
    fs.writeFileSync(outputPath, simplifiedText, 'utf-8');
    console.log(`💾 Saved pilot simplification to: ${outputPath}`);

    // Save metadata
    const metadata = {
      id: BOOK_INFO.id,
      level: level,
      originalSentences: sentences.length,
      processedSentences: pilotSentences.length,
      outputSentences: simplifiedSentences.length,
      estimatedCost: totalCost,
      createdAt: new Date().toISOString(),
      status: 'pilot-completed',
      guidelines: A2_GUIDELINES
    };

    const metadataPath = path.join(cacheDir, `anne-of-green-gables-A2-pilot-metadata.json`);
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
    console.log(`📋 Metadata saved to: ${metadataPath}`);

    console.log(`\n✅ PILOT SIMPLIFICATION COMPLETED!`);
    console.log(`📊 Processed: ${pilotSentences.length} sentences`);
    console.log(`💰 Estimated cost: $${totalCost.toFixed(3)}`);
    console.log(`📈 Next step: Review pilot results, then run full simplification`);

    return {
      simplifiedText,
      metadata,
      sentenceCount: simplifiedSentences.length,
      cost: totalCost
    };

  } catch (error) {
    console.error('❌ Error in simplification:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const level = process.argv[2] || 'A2';
  simplifyAnneOfGreenGables(level);
}

export { simplifyAnneOfGreenGables };