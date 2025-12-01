#!/usr/bin/env node

/**
 * Simplify "The Danger of a Single Story" TED Talk to B1 CEFR Level
 *
 * Creates B1 version with 1,500-2,500 word vocabulary for upper-intermediate learners
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
const OUTPUT_FILE = path.join(CACHE_DIR, 'danger-of-single-story-b1-simplified.txt');

async function simplifyToB1() {
  console.log('📝 Simplifying "The Danger of a Single Story" to B1 Level...\n');

  // Read original transcript
  if (!fs.existsSync(ORIGINAL_FILE)) {
    console.error(`❌ Original transcript not found: ${ORIGINAL_FILE}`);
    process.exit(1);
  }

  const originalText = fs.readFileSync(ORIGINAL_FILE, 'utf8');
  console.log(`📖 Original transcript loaded: ${originalText.length} characters`);

  // Create simplification prompt for B1 level
  const prompt = `You are an expert ESL content creator. Simplify this TED Talk transcript to B1 CEFR level.

B1 Level Requirements:
- Use 1,500-2,500 word vocabulary (everyday words plus some abstract concepts)
- Create varied sentences (10-20 words each on average)
- Use present simple, past simple, present perfect, and some conditional tenses
- Allow compound and complex sentences with subordinate clauses
- Keep ALL the detailed personal stories and cultural examples
- Maintain the sophisticated message and emotional depth
- Natural, flowing narrative with clear connections between ideas

Important:
- Keep all the main stories (British books, roommate, Fide, Mexican trip, Nigerian writers)
- Preserve Chimamanda's intellectual voice and thoughtful analysis
- Maintain the structure: personal experience → realization → broader implications
- Target length: 130-150 sentences (closer to original length)
- Use sophisticated transitions and connectors

TED Talk Transcript:
${originalText}

Please provide ONLY the simplified B1 text, with no introduction or explanation.`;

  console.log('🤖 Calling GPT-4 for B1 simplification...');

  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
      {
        role: 'system',
        content: 'You are an expert ESL content creator specializing in CEFR level text simplification. You create natural-sounding simplified texts that preserve intellectual depth and emotional nuance.'
      },
      {
        role: 'user',
        content: prompt
      }
    ],
    temperature: 0.3,
    max_tokens: 4200
  });

  const simplifiedText = response.choices[0].message.content.trim();

  // Save simplified text
  fs.writeFileSync(OUTPUT_FILE, simplifiedText);

  // Calculate stats
  const sentences = simplifiedText.split(/[.!?]+/).filter(s => s.trim().length > 5).length;
  const words = simplifiedText.split(/\s+/).length;

  console.log('\n✅ B1 Simplification Complete!');
  console.log(`   📄 Saved to: ${OUTPUT_FILE}`);
  console.log(`   📊 Sentences: ${sentences}`);
  console.log(`   📊 Words: ${words}`);
  console.log(`   📊 Characters: ${simplifiedText.length}`);
  console.log(`   📊 Avg words/sentence: ${(words/sentences).toFixed(1)}`);

  console.log('\n💡 Next steps:');
  console.log('   1. Review the simplified text');
  console.log('   2. Generate preview: node scripts/generate-danger-b1-preview-complete.js');
  console.log('   3. Generate bundles: node scripts/generate-danger-of-single-story-b1-bundles.js --pilot');
}

simplifyToB1().catch(error => {
  console.error('❌ Error simplifying to B1:', error);
  process.exit(1);
});
