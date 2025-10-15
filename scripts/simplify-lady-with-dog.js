import { PrismaClient } from '@prisma/client';
import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });

const prisma = new PrismaClient();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const BOOK_ID = 'lady-with-dog';

// SCRIPT LEVEL VALIDATION - MANDATORY FIRST (prevents runtime failures)
const VALID_LEVELS = ['A1', 'A2', 'B1'];

// Get target level from command line argument
const targetLevel = process.argv[2];

// Validate level before proceeding
if (!targetLevel) {
  console.error('❌ Error: Please specify a CEFR level (A1, A2, or B1)');
  console.log('Usage: node scripts/simplify-lady-with-dog.js [A1|A2|B1]');
  process.exit(1);
}

if (!VALID_LEVELS.includes(targetLevel)) {
  console.error(`❌ Error: Invalid level "${targetLevel}". Valid levels: ${VALID_LEVELS.join(', ')}`);
  process.exit(1);
}

const CEFR_LEVEL = targetLevel;

// CEFR Level Guidelines
const A1_GUIDELINES = `
- Simple present and past tense only
- 6-12 words per sentence (compound sentences allowed)
- Basic vocabulary (most common 1000 words)
- Simple sentence structures
- Clear subject-verb-object patterns
`;

const A2_GUIDELINES = `
- Present, past, and simple future tenses
- 8-15 words per sentence (complex sentences allowed)
- Expanded vocabulary (2000+ words, some descriptive language)
- More complex sentence structures
- Can include some subordinate clauses
`;

const B1_GUIDELINES = `
- All basic tenses, some conditional
- 12-25 words per sentence (complex sentences)
- Broader vocabulary (3000+ words)
- Complex sentence structures with multiple clauses
- Cultural references explained simply
`;

const guidelines = {
  'A1': A1_GUIDELINES,
  'A2': A2_GUIDELINES,
  'B1': B1_GUIDELINES
};

const CACHE_DIR = path.join(process.cwd(), 'cache');
const INPUT_FILE = path.join(CACHE_DIR, `${BOOK_ID}-modernized.txt`);
const CACHE_FILE = path.join(CACHE_DIR, `${BOOK_ID}-${CEFR_LEVEL}-simplified.json`);

async function simplifyLadyWithDog() {
  console.log(`📚 Simplifying "The Lady with the Dog" to ${CEFR_LEVEL} level...`);

  // Check if we should use cached results
  const shouldUseFresh = process.argv.includes('--fresh');

  if (fs.existsSync(CACHE_FILE) && !shouldUseFresh) {
    console.log('📄 Found existing simplified cache. Use --fresh to regenerate.');
    const cachedData = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
    console.log(`✅ Using cached simplified text: ${cachedData.sentences.length} sentences`);
    await saveToDatabases(cachedData.sentences);
    return cachedData.sentences;
  }

  // Read modernized text
  if (!fs.existsSync(INPUT_FILE)) {
    throw new Error(`Modernized text file not found: ${INPUT_FILE}. Run modernize script first.`);
  }

  const modernizedText = fs.readFileSync(INPUT_FILE, 'utf8');
  console.log(`📖 Modernized text loaded: ${modernizedText.length} characters`);

  // Split into sentences
  const sentences = modernizedText.match(/[^.!?]+[.!?]+/g) || [];
  console.log(`📝 Found ${sentences.length} sentences to simplify`);

  // Process in chunks for better API handling
  const CHUNK_SIZE = 10;
  const chunks = [];

  for (let i = 0; i < sentences.length; i += CHUNK_SIZE) {
    chunks.push(sentences.slice(i, i + CHUNK_SIZE));
  }

  console.log(`🔄 Processing ${chunks.length} chunks of ${CHUNK_SIZE} sentences each`);

  const simplifiedSentences = [];
  let processedChunks = 0;

  for (const chunk of chunks) {
    try {
      console.log(`\n📝 Processing chunk ${processedChunks + 1}/${chunks.length}...`);

      const simplificationPrompt = `
You are simplifying text for ESL learners at the ${CEFR_LEVEL} level.

CRITICAL REQUIREMENTS:
1. PRESERVE EXACT SENTENCE COUNT: Return exactly ${chunk.length} sentences
2. MAINTAIN STORY MEANING: No plot changes or omissions
3. USE COMPOUND SENTENCES: Natural flow, not micro-sentences
4. PRESERVE CHARACTER NAMES: Keep Dmitri Dmitritch Gurov, Anna Sergeyevna, etc.
5. PRESERVE PLACE NAMES: Keep Yalta, Moscow, Petersburg, etc.

${CEFR_LEVEL} GUIDELINES:${guidelines[CEFR_LEVEL]}

SENTENCE STRUCTURE EXAMPLES:
${CEFR_LEVEL === 'A1' ? `
- GOOD: "The man is tall and walks to his home quickly." (9 words)
- BAD: "The man is tall. He walks. He goes home." (micro-sentences)
- FOCUS: Simple relationships, clear love story progression
` : CEFR_LEVEL === 'A2' ? `
- GOOD: "The man is tall and walks fast, then goes home because he is tired." (13 words)
- BAD: "The man who is tall walks fast to his home because he feels tired today." (15+ words)
- FOCUS: Emotional development, relationship complexity
` : `
- GOOD: "The tall man walks quickly to his home because he feels tired after work." (13 words)
- Complex structures allowed with proper connectors
- FOCUS: Psychological depth, social commentary
`}

STORY CONTEXT: This is Chekhov's "The Lady with the Dog" - a love story about a man who has casual affairs but finds unexpected true love with Anna Sergeyevna in Yalta.

Original sentences to simplify:
${chunk.map((s, i) => `${i + 1}. ${s.trim()}`).join('\n')}

Return ONLY a JSON array of simplified sentences, like this:
["Simplified sentence 1.", "Simplified sentence 2.", ...]
`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: simplificationPrompt }],
        temperature: 0.3,
        max_tokens: 2000
      });

      const responseText = response.choices[0].message.content.trim();

      // Robust JSON extraction
      let simplifiedChunkSentences;
      try {
        // Try direct JSON parse first
        const parsed = JSON.parse(responseText);
        if (Array.isArray(parsed)) {
          simplifiedChunkSentences = parsed;
        } else {
          throw new Error('Response is not an array');
        }
      } catch (e) {
        // Extract JSON array from text
        const jsonMatch = responseText.match(/\[(.*?)\]/s);
        if (jsonMatch) {
          try {
            simplifiedChunkSentences = JSON.parse(jsonMatch[0]);
          } catch (e2) {
            console.error('Failed to parse JSON, using fallback method');
            simplifiedChunkSentences = responseText.split('\n')
              .map(line => line.replace(/^\d+\.\s*/, '').trim())
              .filter(line => line.length > 10);
          }
        } else {
          throw new Error('Could not extract JSON array from response');
        }
      }

      // Validate sentence count
      if (simplifiedChunkSentences.length !== chunk.length) {
        console.error(`❌ FAILED: Expected ${chunk.length} sentences, got ${simplifiedChunkSentences.length}`);
        throw new Error('Sentence count must match exactly for perfect audio-text harmony');
      }

      // Add simplified sentences with metadata
      for (let i = 0; i < simplifiedChunkSentences.length; i++) {
        const simplifiedSentence = {
          sentenceIndex: processedChunks * CHUNK_SIZE + i,
          originalText: chunk[i].trim(),
          simplifiedText: simplifiedChunkSentences[i].trim(),
          level: CEFR_LEVEL,
          wordCount: simplifiedChunkSentences[i].trim().split(' ').length
        };

        // Validate word count for level
        const wordCount = simplifiedSentence.wordCount;
        if (CEFR_LEVEL === 'A1' && wordCount > 12) {
          console.warn(`⚠️ A1 sentence ${simplifiedSentence.sentenceIndex} has ${wordCount} words (max 12)`);
        } else if (CEFR_LEVEL === 'A2' && wordCount > 15) {
          console.warn(`⚠️ A2 sentence ${simplifiedSentence.sentenceIndex} has ${wordCount} words (max 15)`);
        } else if (CEFR_LEVEL === 'B1' && wordCount > 25) {
          console.warn(`⚠️ B1 sentence ${simplifiedSentence.sentenceIndex} has ${wordCount} words (max 25)`);
        }

        simplifiedSentences.push(simplifiedSentence);
      }

      processedChunks++;
      console.log(`✅ Chunk ${processedChunks}/${chunks.length} completed`);

      // Save progress to cache after each chunk
      const progressCache = {
        sentences: simplifiedSentences,
        metadata: {
          bookId: BOOK_ID,
          cefrLevel: CEFR_LEVEL,
          processedChunks: processedChunks,
          totalChunks: chunks.length,
          inProgress: true,
          savedAt: new Date().toISOString()
        }
      };

      if (!fs.existsSync(CACHE_DIR)) {
        fs.mkdirSync(CACHE_DIR, { recursive: true });
      }

      fs.writeFileSync(CACHE_FILE, JSON.stringify(progressCache, null, 2));
      console.log(`💾 Progress saved: ${simplifiedSentences.length} sentences`);

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));

    } catch (error) {
      console.error(`❌ Failed to process chunk ${processedChunks + 1}:`, error.message);
      throw error;
    }
  }

  console.log(`\n✅ Simplification complete: ${simplifiedSentences.length} sentences`);

  // Save final cache
  const finalCache = {
    sentences: simplifiedSentences,
    metadata: {
      bookId: BOOK_ID,
      cefrLevel: CEFR_LEVEL,
      totalSentences: simplifiedSentences.length,
      inProgress: false,
      completedAt: new Date().toISOString()
    }
  };

  fs.writeFileSync(CACHE_FILE, JSON.stringify(finalCache, null, 2));
  console.log(`💾 Final cache saved: ${CACHE_FILE}`);

  // Save to databases
  await saveToDatabases(simplifiedSentences);

  return simplifiedSentences;
}

async function saveToDatabases(simplifiedSentences) {
  try {
    console.log('\n💾 Saving to databases...');

    // Save to BookSimplification table
    for (const sentence of simplifiedSentences) {
      await prisma.bookSimplification.upsert({
        where: {
          bookId_targetLevel_chunkIndex_versionKey: {
            bookId: BOOK_ID,
            targetLevel: CEFR_LEVEL,
            chunkIndex: sentence.sentenceIndex,
            versionKey: 'v1'
          }
        },
        update: {
          originalText: sentence.originalText,
          simplifiedText: sentence.simplifiedText,
          vocabularyChanges: [],
          culturalAnnotations: [],
          qualityScore: null
        },
        create: {
          bookId: BOOK_ID,
          targetLevel: CEFR_LEVEL,
          chunkIndex: sentence.sentenceIndex,
          originalText: sentence.originalText,
          simplifiedText: sentence.simplifiedText,
          vocabularyChanges: [],
          culturalAnnotations: [],
          qualityScore: null,
          versionKey: 'v1'
        }
      });
    }

    console.log(`✅ Saved ${simplifiedSentences.length} sentences to BookSimplification`);

  } catch (error) {
    console.error('❌ Database save failed:', error.message);
    console.log('📁 Simplified text preserved in cache file for recovery');
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  simplifyLadyWithDog()
    .then((sentences) => {
      console.log('\n✅ The Lady with the Dog simplified successfully!');
      console.log(`📊 Final statistics:`);
      console.log(`   📝 Total sentences: ${sentences.length}`);
      console.log(`   🎯 CEFR Level: ${CEFR_LEVEL}`);

      const avgWordCount = sentences.reduce((sum, s) => sum + s.wordCount, 0) / sentences.length;
      console.log(`   📖 Average words per sentence: ${avgWordCount.toFixed(1)}`);
    })
    .catch(console.error);
}

export { simplifyLadyWithDog };