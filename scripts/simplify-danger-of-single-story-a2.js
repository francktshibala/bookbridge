#!/usr/bin/env node

/**
 * Simplify "The Danger of a Single Story" TED Talk to A2 CEFR Level
 *
 * Creates A2 version with 1,000-1,500 word vocabulary for intermediate learners
 */

import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const CACHE_DIR = path.join(__dirname, '..', 'cache', 'ted-talks');
const ORIGINAL_FILE = path.join(CACHE_DIR, 'danger-of-single-story-original.txt');
const OUTPUT_FILE = path.join(CACHE_DIR, 'danger-of-single-story-a2-simplified.txt');

async function simplifyToA2() {
  console.log('📝 Simplifying "The Danger of a Single Story" to A2 Level...\n');

  // Read original transcript
  if (!fs.existsSync(ORIGINAL_FILE)) {
    console.error(`❌ Original transcript not found: ${ORIGINAL_FILE}`);
    process.exit(1);
  }

  const originalText = fs.readFileSync(ORIGINAL_FILE, 'utf8');
  console.log(`📖 Original transcript loaded: ${originalText.length} characters`);

  // Create simplification prompt for A2 level
  const prompt = `You are an expert ESL content creator. Simplify this TED Talk transcript to A2 CEFR level.

A2 Level Requirements:
- Use 1,000-1,500 word vocabulary (common everyday words)
- Create clear sentences (8-15 words each on average)
- Use present simple, past simple, and present perfect tenses
- Allow simple compound sentences with "and", "but", "because"
- Keep the personal stories and cultural examples
- Maintain the emotional impact and key message
- Natural, engaging flow

Important:
- Keep all the main stories (British books, roommate Fide, Mexican trip)
- Preserve Chimamanda's voice and personality
- Maintain the structure: problem → examples → solution
- Target length: 150-180 sentences (slightly longer than A1)
- Use simple transitions between ideas

TED Talk Transcript:
${originalText}

Please provide ONLY the simplified A2 text, with no introduction or explanation.`;

  console.log('🤖 Calling GPT-4 for A2 simplification...');

  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
      {
        role: 'system',
        content: 'You are an expert ESL content creator specializing in CEFR level text simplification. You create clear, natural-sounding simplified texts that maintain the original message and emotion.'
      },
      {
        role: 'user',
        content: prompt
      }
    ],
    temperature: 0.3,
    max_tokens: 4500
  });

  const simplifiedText = response.choices[0].message.content.trim();

  // Save simplified text
  fs.writeFileSync(OUTPUT_FILE, simplifiedText);

  // Calculate stats
  const sentences = simplifiedText.split(/[.!?]+/).filter(s => s.trim().length > 5).length;
  const words = simplifiedText.split(/\s+/).length;

  console.log('\n✅ A2 Simplification Complete!');
  console.log(`   📄 Saved to: ${OUTPUT_FILE}`);
  console.log(`   📊 Sentences: ${sentences}`);
  console.log(`   📊 Words: ${words}`);
  console.log(`   📊 Characters: ${simplifiedText.length}`);
  console.log(`   📊 Avg words/sentence: ${(words/sentences).toFixed(1)}`);

  console.log('\n💡 Next steps:');
  console.log('   1. Review the simplified text');
  console.log('   2. Generate preview: node scripts/generate-danger-of-single-story-a2-preview.js');
  console.log('   3. Generate bundles: node scripts/generate-danger-of-single-story-a2-bundles.js --pilot');
}

simplifyToA2().catch(error => {
  console.error('❌ Error simplifying to A2:', error);
  process.exit(1);
});
