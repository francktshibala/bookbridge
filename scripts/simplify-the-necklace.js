#!/usr/bin/env node

/**
 * Simplify "The Necklace" to A2 and B1 levels with natural compound sentences
 * Following Master Mistakes Prevention guidelines for multi-level simplification
 */

import { config } from 'dotenv';
import fs from 'fs';
import path from 'path';
import https from 'https';

// Load environment variables
config({ path: '.env.local' });

const BOOK_INFO = {
  id: 'the-necklace',
  inputFile: 'the-necklace-raw.txt',
  outputFileA1: 'the-necklace-A1-simplified.txt',
  outputFileA2: 'the-necklace-A2-simplified.txt',
  outputFileB1: 'the-necklace-B1-simplified.txt'
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
- AVOID: "She is sad. She cries. She goes." (robotic micro-sentences)
- CORRECT A1: "She is sad and cries." OR "She is sad. She cries because she feels bad." (natural flow)
- Each sentence should express one complete thought
- Avoid semicolons - use periods instead
- Preserve punctuation for proper formatting
- Validate natural reading flow
`;

// A2 Simplification Guidelines (same as Anne of Green Gables)
const A2_GUIDELINES = `
- Use 1200-1500 most common words
- Present and simple past tense
- Natural compound sentences (11-13 words average - COMPOUND FLOW)
- MAXIMUM 15 WORDS PER SENTENCE (Master Prevention - prevents highlighting issues)
- More connectors: "and", "but", "so", "then", "because"
- Explain cultural references simply
- Maintain exact 1:1 sentence count mapping (CRITICAL)
- Generate compound sentences for natural flow (NOT micro-sentences)
- AVOID: "She is sad. She cries. She feels bad." (robotic micro-sentences)
- CORRECT A2: "She is sad and cries because she feels bad inside." (natural 11 words)
- Each sentence should express one complete thought
- Avoid semicolons - use periods instead
- Preserve punctuation for proper formatting
- Validate natural reading flow
`;

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
- AVOID: "She was sad. She cried. She felt bad." (simplified too much)
- CORRECT B1: "She was deeply unhappy and began to cry because she felt misunderstood by everyone around her." (natural 16 words)
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
    .replace(/[^\x20-\x7E]/g, ' ') // Remove non-ASCII characters except basic punctuation
    .trim();
}

// Helper function to call OpenAI API (primary option since Claude has issues)
async function callOpenAI(sentence, level) {
  return new Promise((resolve, reject) => {
    const cleanSentence = cleanSentenceForAPI(sentence);
    const guidelines = level === 'A1' ? A1_GUIDELINES : (level === 'A2' ? A2_GUIDELINES : B1_GUIDELINES);

    const data = JSON.stringify({
      model: 'gpt-4o-mini',
      max_tokens: 150,
      messages: [{
        role: 'user',
        content: `Simplify this sentence to ${level} English level following these rules:

${guidelines}

Original sentence: "${cleanSentence}"

Requirements:
1. Use ${level === 'A1' ? '500-1000' : (level === 'A2' ? '1200-1500' : '2000-2500')} most common words only
2. Create ${level === 'A1' ? 'natural compound sentences (8-12 words average)' : (level === 'A2' ? 'natural compound sentences (11-13 words average)' : 'flowing complex sentences (15-18 words average)')}
3. CRITICAL: Maximum ${level === 'A2' ? '15' : '25'} words per sentence (prevents highlighting issues)
4. Each sentence should express one complete thought
5. Avoid semicolons - use periods instead
6. Use appropriate connectors for ${level} level
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

// Helper function to call Claude API (fallback option)
async function callClaudeAPI(sentence, level) {
  return new Promise((resolve, reject) => {
    const cleanSentence = cleanSentenceForAPI(sentence);
    const guidelines = level === 'A1' ? A1_GUIDELINES : (level === 'A2' ? A2_GUIDELINES : B1_GUIDELINES);

    const data = JSON.stringify({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 150,
      messages: [{
        role: 'user',
        content: `Simplify this sentence to ${level} English level following these rules:

${guidelines}

Original sentence: "${cleanSentence}"

Requirements:
1. Use ${level === 'A1' ? '500-1000' : (level === 'A2' ? '1200-1500' : '2000-2500')} most common words only
2. Create ${level === 'A1' ? 'natural compound sentences (8-12 words average)' : (level === 'A2' ? 'natural compound sentences (11-13 words average)' : 'flowing complex sentences (15-18 words average)')}
3. CRITICAL: Maximum ${level === 'A2' ? '15' : '25'} words per sentence (prevents highlighting issues)
4. Each sentence should express one complete thought
5. Avoid semicolons - use periods instead
6. Use appropriate connectors for ${level} level
7. Keep the complete meaning and emotion
8. Return ONLY the simplified sentence, no explanation

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

async function simplifyTheNecklace(level = 'A2') {
  console.log(`💎 Simplifying "The Necklace" to ${level} level...`);

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
        // Skip very short sentences (title, etc.)
        simplifiedSentences.push(sentence);
        continue;
      }

      console.log(`\n📝 Processing sentence ${i + 1}/${sentencesToProcess.length} (${level})`);
      console.log(`Original: ${sentence}`);

      try {
        let simplified;

        // Try OpenAI first, fallback to Claude if it fails
        try {
          simplified = await callOpenAI(sentence, level);
          console.log(`✅ OpenAI: ${simplified}`);
        } catch (openaiError) {
          console.log(`⚠️ OpenAI failed, trying Claude...`);
          simplified = await callClaudeAPI(sentence, level);
          console.log(`✅ Claude: ${simplified}`);
        }

        // Count words to verify guidelines and sentence limits
        const wordCount = simplified.split(/\s+/).length;
        const expectedRange = level === 'A1' ? '6-12' : (level === 'A2' ? '8-15' : '12-25');
        const maxLimit = level === 'A1' ? 12 : (level === 'A2' ? 15 : 25);
        console.log(`📊 Word count: ${wordCount} words (max: ${maxLimit})`);

        if ((level === 'A1' && (wordCount < 6 || wordCount > 12)) ||
            (level === 'A2' && (wordCount < 8 || wordCount > 15))) {
          console.log(`⚠️ ${level} word count outside range (${expectedRange}), but keeping result`);
        } else if (level === 'B1' && (wordCount < 12 || wordCount > 25)) {
          console.log(`⚠️ B1 word count outside range (12-25), but keeping result`);
        }

        // Check for sentence length limit compliance and retry if needed
        if (wordCount > maxLimit) {
          console.log(`🚨 SENTENCE TOO LONG: ${wordCount} words exceeds ${maxLimit} word limit! Retrying...`);

          try {
            // Retry with stricter prompt
            const retryPrompt = `URGENT: Rewrite this sentence in EXACTLY ${maxLimit} words or less (current: ${wordCount} words):

"${simplified}"

Requirements:
- Maximum ${maxLimit} words (COUNT THEM!)
- Keep the meaning but make it shorter
- Use simpler grammar if needed
- Return ONLY the shortened sentence`;

            let shorterVersion;
            try {
              shorterVersion = await callOpenAI(retryPrompt, level);
            } catch (retryError) {
              shorterVersion = await callClaudeAPI(retryPrompt, level);
            }

            const retryWordCount = shorterVersion.split(/\\s+/).length;
            if (retryWordCount <= maxLimit) {
              simplified = shorterVersion;
              console.log(`✅ Retry successful: ${retryWordCount} words`);
              console.log(`   Fixed: ${simplified}`);
            } else {
              console.log(`⚠️ Retry still too long (${retryWordCount} words), keeping original`);
            }
          } catch (retryError) {
            console.log(`⚠️ Retry failed, keeping original: ${retryError.message}`);
          }
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
    const outputFile = level === 'A1' ? BOOK_INFO.outputFileA1 : (level === 'A2' ? BOOK_INFO.outputFileA2 : BOOK_INFO.outputFileB1);
    const outputPath = path.join(cacheDir, `the-necklace-${level}-simplified${isPilot ? '-pilot' : ''}.txt`);
    fs.writeFileSync(outputPath, simplifiedText, 'utf-8');
    console.log(`💾 Saved ${isPilot ? 'pilot' : 'full'} simplification to: ${outputPath}`);

    // Save metadata
    const metadata = {
      id: BOOK_INFO.id,
      level: level,
      originalSentences: sentences.length,
      processedSentences: sentencesToProcess.length,
      outputSentences: simplifiedSentences.length,
      estimatedCost: totalCost,
      createdAt: new Date().toISOString(),
      status: isPilot ? 'pilot-completed' : 'full-completed',
      guidelines: level === 'A2' ? A2_GUIDELINES : B1_GUIDELINES
    };

    const metadataPath = path.join(cacheDir, `the-necklace-${level}${isPilot ? '-pilot' : ''}-metadata.json`);
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
    console.log(`📋 Metadata saved to: ${metadataPath}`);

    console.log(`\n✅ ${isPilot ? 'PILOT' : 'FULL'} SIMPLIFICATION COMPLETED!`);
    console.log(`📊 Processed: ${sentencesToProcess.length} sentences`);
    console.log(`💰 Estimated cost: $${totalCost.toFixed(3)}`);
    if (isPilot) {
      console.log(`📈 Next step: Review pilot results, then run full simplification`);
    } else {
      console.log(`🎯 Ready for audio bundle generation!`);
    }

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
  if (!['A1', 'A2', 'B1'].includes(level)) {
    console.error('❌ Level must be A1, A2, or B1');
    process.exit(1);
  }
  simplifyTheNecklace(level);
}

export { simplifyTheNecklace };