import { PrismaClient } from '@prisma/client';
import OpenAI from 'openai';
import fs from 'fs';

const prisma = new PrismaClient();
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const BOOK_ID = 'jane-eyre-scale-test-001';
const CEFR_LEVEL = process.argv[2] || 'A2'; // Pass level as argument
const TEST_LIMIT = process.env.TEST_LIMIT ? parseInt(process.env.TEST_LIMIT) : null;
const CACHE_FILE = `./cache/jane-eyre-${CEFR_LEVEL}-simplified.json`;

async function simplifyJaneEyre() {
  console.log(`📚 Starting Jane Eyre simplification to ${CEFR_LEVEL} level...`);
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
  if (!fs.existsSync('./cache')) {
    fs.mkdirSync('./cache', { recursive: true });
  }

  // Read the raw text
  const rawText = fs.readFileSync('public/books/scale-test/jane-eyre-raw.txt', 'utf8');

  // Extract main content
  const startMarker = 'CHAPTER I';
  const endMarker = '*** END OF THE PROJECT GUTENBERG EBOOK';
  const startIndex = rawText.indexOf(startMarker);
  const endIndex = rawText.indexOf(endMarker);

  if (startIndex === -1 || endIndex === -1) {
    throw new Error('Could not find book boundaries');
  }

  const bookText = rawText.substring(startIndex, endIndex);

  // Split into sentences
  const sentences = splitIntoSentences(bookText);
  const sentencesToProcess = TEST_LIMIT ? sentences.slice(0, TEST_LIMIT) : sentences;

  console.log(`Processing ${sentencesToProcess.length} sentences...`);

  // Process in chunks of 10 sentences for better context
  const simplifiedSentences = [];
  for (let i = 0; i < sentencesToProcess.length; i += 10) {
    const chunk = sentencesToProcess.slice(i, i + 10);
    const chunkText = chunk.map(s => s.text).join(' ');

    console.log(`Simplifying sentences ${i + 1}-${Math.min(i + 10, sentencesToProcess.length)}...`);

    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: `You are a language simplification expert. Simplify the following text to ${CEFR_LEVEL} level.

          Guidelines for ${CEFR_LEVEL}:
          ${getGuidelinesForLevel(CEFR_LEVEL)}

          IMPORTANT:
          - Maintain the same number of sentences
          - Keep the story and meaning intact
          - Use simpler vocabulary and grammar
          - Return ONLY the simplified text, no explanations`
        },
        {
          role: 'user',
          content: chunkText
        }
      ],
      temperature: 0.3,
      max_tokens: 1000
    });

    const simplifiedChunk = response.choices[0].message.content;
    const simplifiedChunkSentences = splitIntoSentences(simplifiedChunk);
    simplifiedSentences.push(...simplifiedChunkSentences);
  }

  // Join all simplified text
  const simplifiedText = simplifiedSentences.map(s => s.text).join(' ');

  // Save to cache before database storage
  console.log('💾 Saving to cache...');
  fs.writeFileSync(CACHE_FILE, JSON.stringify(simplifiedSentences, null, 2));
  console.log(`✅ Cached ${simplifiedSentences.length} sentences to ${CACHE_FILE}`);

  // Store in database
  console.log('💾 Storing simplification in database...');
  await prisma.bookSimplification.upsert({
    where: {
      book_id_target_level_chunk_index_version_key: {
        bookId: BOOK_ID,
        targetLevel: CEFR_LEVEL,
        chunkIndex: 0,
        versionKey: 'v1'
      }
    },
    update: {
      simplifiedText: simplifiedText,
      wordCount: simplifiedSentences.length,
      simplificationLogs: `Full book simplification completed: ${simplifiedSentences.length} sentences`
    },
    create: {
      bookId: BOOK_ID,
      targetLevel: CEFR_LEVEL,
      chunkIndex: 0,
      originalText: bookText.substring(0, 10000), // Store sample for reference
      simplifiedText: simplifiedText,
      vocabularyChanges: [],
      culturalAnnotations: [],
      qualityScore: null
    }
  });

  console.log(`✅ Simplification complete! ${sentencesToProcess.length} sentences simplified to ${CEFR_LEVEL} level`);
  console.log(`\nNext step: Generate audio bundles with:`);
  console.log(`TEST_LIMIT=${TEST_LIMIT || sentencesToProcess.length} CEFR_LEVEL=${CEFR_LEVEL} node scripts/generate-jane-eyre-bundles.js`);
}

function splitIntoSentences(text) {
  const sentences = [];
  const rawSentences = text.split(/([.!?]+\s+)/);

  let currentSentence = '';
  for (let i = 0; i < rawSentences.length; i++) {
    currentSentence += rawSentences[i];

    if (/[.!?]+\s*$/.test(currentSentence) && currentSentence.trim().length > 20) {
      const trimmed = currentSentence.trim();
      if (!trimmed.startsWith('CHAPTER')) {
        sentences.push({
          index: sentences.length,
          text: trimmed
        });
      }
      currentSentence = '';
    }
  }

  return sentences;
}

function getGuidelinesForLevel(level) {
  const guidelines = {
    'A1': `- Use only present simple and present continuous
           - Vocabulary: 500-700 most common words
           - Very short, simple sentences (5-8 words)
           - Concrete, everyday topics only`,
    'A2': `- Use present, past simple, and future (will/going to)
           - Vocabulary: 1000-1500 common words
           - Simple sentences (8-12 words)
           - Familiar everyday situations`,
    'B1': `- Use all basic tenses and some conditionals
           - Vocabulary: 2000-2500 words
           - Clear standard language (10-15 words)
           - Can handle abstract concepts if explained`,
    'B2': `- Use complex grammar including passive voice
           - Vocabulary: 3000-4000 words
           - Longer sentences with subordinate clauses
           - Can handle most topics with clarity`
  };

  return guidelines[level] || guidelines['A2'];
}

async function storeCachedResults(cachedSentences) {
  console.log('💾 Storing cached results in database...');

  const simplifiedText = cachedSentences.map(s => s.text).join(' ');

  await prisma.bookSimplification.upsert({
    where: {
      book_id_target_level_chunk_index_version_key: {
        bookId: BOOK_ID,
        targetLevel: CEFR_LEVEL,
        chunkIndex: 0,
        versionKey: 'v1'
      }
    },
    update: {
      simplifiedText: simplifiedText,
      wordCount: cachedSentences.length,
      simplificationLogs: `Loaded from cache: ${cachedSentences.length} sentences`
    },
    create: {
      bookId: BOOK_ID,
      targetLevel: CEFR_LEVEL,
      chunkIndex: 0,
      originalText: 'Cached result',
      simplifiedText: simplifiedText,
      vocabularyChanges: [],
      culturalAnnotations: [],
      qualityScore: null,
      wordCount: cachedSentences.length,
      versionKey: 'v1',
      simplificationLogs: `Loaded from cache: ${cachedSentences.length} sentences`
    }
  });

  console.log('✅ Cached results stored in database!');
}

// Run the simplification
simplifyJaneEyre()
  .then(() => {
    console.log('✅ Done!');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Error:', error);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });