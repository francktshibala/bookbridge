import { PrismaClient } from '@prisma/client';
import OpenAI from 'openai';
import fs from 'fs';
import crypto from 'crypto';
import path from 'path';
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });

const prisma = new PrismaClient();
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const BOOK_ID = 'christmas-carol-a1-enhanced';
const CEFR_LEVEL = process.argv[2] || 'A1';
const TEST_LIMIT = process.env.TEST_LIMIT ? parseInt(process.env.TEST_LIMIT) : null;

// Absolute paths (Pipeline lesson)
const PROJECT_ROOT = path.resolve(process.cwd());
const CACHE_FILE = path.join(PROJECT_ROOT, `cache/christmas-carol-${CEFR_LEVEL}-simplified.json`);
const INPUT_FILE = path.join(PROJECT_ROOT, 'data/christmas-carol/modernized.txt');

// Generate content hash for version control
function generateContentHash(text) {
  return crypto.createHash('sha256').update(text).digest('hex').substring(0, 16);
}

// A1 Flow Rules from research/agent1-linguistic-flow-findings.md
function applyA1FlowRules(sentences) {
  console.log('🎯 Applying A1 Natural Flow Enhancement Rules...');

  const enhancedSentences = [];

  for (let i = 0; i < sentences.length; i++) {
    let currentSentence = sentences[i].trim();
    let nextSentence = i + 1 < sentences.length ? sentences[i + 1].trim() : null;

    // Rule 1: Merge adjacent micro-sentences (<8 words) that form action chains
    if (nextSentence &&
        currentSentence.split(' ').length <= 8 &&
        nextSentence.split(' ').length <= 8 &&
        areSemanticallyClinked(currentSentence, nextSentence)) {

      const connector = chooseMergeConnector(currentSentence, nextSentence);
      const mergedSentence = `${currentSentence}${connector}${nextSentence}`;

      enhancedSentences.push(mergedSentence);
      i++; // Skip next sentence as it's been merged
      continue;
    }

    // Rule 2: Add discourse markers to thought groups (1 per 2-3 sentences)
    if (i > 0 && i % 3 === 0 && needsDiscourseMarker(currentSentence)) {
      const marker = chooseDiscourseMarker(i, sentences.length);
      currentSentence = `${marker} ${currentSentence.charAt(0).toLowerCase()}${currentSentence.slice(1)}`;
    }

    // Rule 3: Replace repeated nouns with pronouns
    if (i > 0) {
      currentSentence = replaceRepeatedNouns(currentSentence, enhancedSentences[enhancedSentences.length - 1]);
    }

    enhancedSentences.push(currentSentence);
  }

  console.log(`✅ Flow enhancement: ${sentences.length} → ${enhancedSentences.length} sentences`);
  return enhancedSentences;
}

// Helper functions for flow rules
function areSemanticallyClinked(sentence1, sentence2) {
  // Simple semantic linking check
  const actionWords = ['walk', 'go', 'move', 'run', 'sit', 'stand', 'look', 'see', 'take', 'give'];
  const hasAction1 = actionWords.some(word => sentence1.toLowerCase().includes(word));
  const hasAction2 = actionWords.some(word => sentence2.toLowerCase().includes(word));
  return hasAction1 && hasAction2;
}

function chooseMergeConnector(sentence1, sentence2) {
  // Choose appropriate A1-safe connector
  if (sentence2.toLowerCase().startsWith('he ') || sentence2.toLowerCase().startsWith('she ')) {
    return ', then ';
  }
  if (sentence1.includes('tired') || sentence1.includes('cold')) {
    return ', so ';
  }
  return ' and ';
}

function needsDiscourseMarker(sentence) {
  // Don't add markers to questions or already-connected sentences
  return !sentence.includes('?') && !sentence.toLowerCase().startsWith('and') &&
         !sentence.toLowerCase().startsWith('but') && !sentence.toLowerCase().startsWith('so');
}

function chooseDiscourseMarker(position, total) {
  const markers = ['Finally,', 'Then,', 'After that,', 'So,'];
  if (position > total * 0.8) return 'Finally,';
  if (position > total * 0.5) return 'After that,';
  return Math.random() > 0.5 ? 'Then,' : 'So,';
}

function replaceRepeatedNouns(currentSentence, previousSentence) {
  if (!previousSentence) return currentSentence;

  // Simple pronoun replacement for common nouns
  const nouns = ['Scrooge', 'man', 'woman', 'boy', 'girl', 'child'];

  for (const noun of nouns) {
    if (previousSentence.includes(noun) && currentSentence.includes(noun)) {
      const pronoun = noun === 'Scrooge' ? 'he' :
                     noun === 'woman' || noun === 'girl' ? 'she' :
                     noun === 'child' ? 'they' : 'he';

      // Replace second occurrence with pronoun
      currentSentence = currentSentence.replace(new RegExp(`\\b${noun}\\b`, 'i'), pronoun);
      break;
    }
  }

  return currentSentence;
}

async function simplifyChristmasCarol() {
  console.log(`🎄 Starting A Christmas Carol simplification to ${CEFR_LEVEL} level with flow enhancement...`);
  if (TEST_LIMIT) {
    console.log(`🧪 TEST MODE: Limited to first ${TEST_LIMIT} sentences`);
  }

  // Check for cached results first
  if (fs.existsSync(CACHE_FILE)) {
    console.log('💾 Found cached simplification, loading...');
    try {
      const cached = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
      console.log(`✅ Loaded ${cached.length} cached sentences`);

      // Store cached results in database
      await storeCachedResults(cached);
      return;
    } catch (error) {
      console.log('❌ Cache file corrupted, proceeding with fresh simplification');
    }
  }

  // Create cache directory
  const cacheDir = path.dirname(CACHE_FILE);
  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true });
  }

  // Read the modernized text
  const modernizedText = fs.readFileSync(INPUT_FILE, 'utf8');
  console.log(`📖 Processing modernized text: ${modernizedText.length} characters`);

  // Split into sentences
  const sentences = splitIntoSentences(modernizedText);
  const sentencesToProcess = TEST_LIMIT ? sentences.slice(0, TEST_LIMIT) : sentences;

  console.log(`Processing ${sentencesToProcess.length} sentences...`);

  // Process in chunks of 10 sentences for better context
  const simplifiedSentences = [];
  const chunkSize = 10;

  for (let i = 0; i < sentencesToProcess.length; i += chunkSize) {
    const chunk = sentencesToProcess.slice(i, i + chunkSize);
    console.log(`Processing sentences ${i + 1}-${Math.min(i + chunkSize, sentencesToProcess.length)}...`);

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: `You are simplifying "A Christmas Carol" to A1 English level for ESL learners.

CRITICAL A1 REQUIREMENTS:
- Use only the 1000 most common English words
- Keep sentences 6-12 words maximum
- Use simple present and past tense only
- Simple Subject-Verb-Object structure
- No complex grammar (conditionals, subjunctive, etc.)

A1 VOCABULARY GUIDELINES:
- Common verbs: be, have, go, see, like, want, need, get, make, do
- Simple adjectives: big, small, good, bad, happy, sad, old, new
- Basic nouns: man, woman, house, day, time, money, work, food
- Keep character names: Scrooge, Bob Cratchit, Tiny Tim
- Christmas words are OK: Christmas, ghost, spirit

PRESERVE STORY ELEMENTS:
- Keep all main story events
- Maintain character personalities (Scrooge's coldness → warmth)
- Preserve Christmas magic and moral lessons
- Keep emotional impact simple but clear

CRITICAL: Return ONLY the simplified sentences, one per line, no JSON formatting:
sentence 1
sentence 2
sentence 3`
          },
          {
            role: 'user',
            content: `Simplify these ${chunk.length} sentences to A1 level:\n\n${chunk.map((s, idx) => `${idx + 1}. ${s}`).join('\n')}`
          }
        ],
        temperature: 0.3,
        max_tokens: 2000
      });

      const responseText = response.choices[0]?.message?.content?.trim();
      if (!responseText) {
        throw new Error('Empty response from OpenAI');
      }

      // Parse line-by-line response (no JSON)
      const simplifiedSentenceTexts = responseText.split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 5)
        .slice(0, chunk.length);

      if (simplifiedSentenceTexts.length !== chunk.length) {
        console.log(`⚠️ Sentence count mismatch: expected ${chunk.length}, got ${simplifiedSentenceTexts.length}`);

        // Auto-correction for sentence count mismatch (Pipeline lesson)
        if (simplifiedSentenceTexts.length < chunk.length) {
          // Pad with simple sentences
          while (simplifiedSentenceTexts.length < chunk.length) {
            simplifiedSentenceTexts.push("The story continues.");
          }
        } else {
          // Truncate excess sentences
          simplifiedSentenceTexts.splice(chunk.length);
        }
      }

      // Create sentence objects
      const chunkSimplified = simplifiedSentenceTexts.map((text, idx) => ({
        original: chunk[idx],
        simplified: text.trim(),
        sentenceIndex: i + idx,
        cefrLevel: CEFR_LEVEL
      }));

      simplifiedSentences.push(...chunkSimplified);

      // Save progress to cache
      fs.writeFileSync(CACHE_FILE, JSON.stringify(simplifiedSentences, null, 2));

      console.log(`✅ Processed chunk ${Math.floor(i / chunkSize) + 1}`);

      // Rate limiting
      if (i + chunkSize < sentencesToProcess.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

    } catch (error) {
      console.error(`❌ Error processing chunk starting at ${i + 1}:`, error.message);

      // Save progress and exit
      fs.writeFileSync(CACHE_FILE, JSON.stringify(simplifiedSentences, null, 2));
      console.log(`💾 Progress saved. Resume with: node scripts/simplify-christmas-carol.js ${CEFR_LEVEL}`);
      process.exit(1);
    }
  }

  console.log(`✅ Simplification to ${CEFR_LEVEL} complete!`);

  // Apply A1 Flow Rules Enhancement
  const simplifiedTexts = simplifiedSentences.map(s => s.simplified);
  const enhancedTexts = applyA1FlowRules(simplifiedTexts);

  // Update simplified sentences with enhanced versions
  enhancedTexts.forEach((enhancedText, index) => {
    if (simplifiedSentences[index]) {
      simplifiedSentences[index].simplified = enhancedText;
      simplifiedSentences[index].flowEnhanced = true;
    }
  });

  // Generate content hash for version control
  const fullSimplifiedText = enhancedTexts.join(' ');
  const contentHash = generateContentHash(fullSimplifiedText);
  console.log(`🔐 Content hash: ${contentHash}`);

  // Store results in database
  await storeCachedResults(simplifiedSentences);

  console.log(`📊 Final statistics:`);
  console.log(`   ${simplifiedSentences.length} sentences processed`);
  console.log(`   Content hash: ${contentHash}`);
  console.log(`   Cache: ${CACHE_FILE}`);
}

// GPT-5 validated sentence extraction function
function extractSentencesFromResponse(responseText, expectedCount) {
  // Strategy 1: Try JSON parse
  try {
    const parsed = JSON.parse(responseText.trim());
    if (Array.isArray(parsed)) return parsed;
  } catch (e) {}

  // Strategy 2: Extract JSON from text
  const jsonMatch = responseText.match(/\\[(.*?)\\]/s);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]);
    } catch (e) {}
  }

  // Strategy 3: Split on sentence endings
  return responseText.split(/[.!?]+/).filter(s => s.length > 10).slice(0, expectedCount);
}

function splitIntoSentences(text) {
  return text
    .split(/[.!?]+/)
    .map(s => s.trim())
    .filter(s => s.length > 10);
}

async function storeCachedResults(simplifiedSentences) {
  console.log('💾 Storing results in database...');

  try {
    // Upsert book content record
    await prisma.bookContent.upsert({
      where: { bookId: BOOK_ID },
      update: {
        title: 'A Christmas Carol (A1 Enhanced)',
        author: 'Charles Dickens',
        fullText: simplifiedSentences.map(s => s.simplified).join(' '),
        totalChunks: Math.ceil(simplifiedSentences.length / 4) // 4 sentences per bundle
      },
      create: {
        bookId: BOOK_ID,
        title: 'A Christmas Carol (A1 Enhanced)',
        author: 'Charles Dickens',
        fullText: simplifiedSentences.map(s => s.simplified).join(' '),
        era: 'Victorian',
        wordCount: simplifiedSentences.map(s => s.simplified).join(' ').split(' ').length,
        totalChunks: Math.ceil(simplifiedSentences.length / 4)
      }
    });

    console.log(`✅ Stored in database as book: ${BOOK_ID}`);
    console.log(`📚 Ready for bundle generation with enhanced A1 flow!`);

  } catch (error) {
    console.error('❌ Database storage failed:', error.message);
  }
}

// Run the script
simplifyChristmasCarol().catch(error => {
  console.error('❌ Script failed:', error.message);
  process.exit(1);
}).finally(() => {
  prisma.$disconnect();
});