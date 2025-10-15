import { PrismaClient } from '@prisma/client';
import OpenAI from 'openai';
import fs from 'fs';
import crypto from 'crypto';

const prisma = new PrismaClient();
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const BOOK_ID = 'sleepy-hollow-enhanced';
const CEFR_LEVEL = process.argv[2] || 'B1';
const TEST_LIMIT = process.env.TEST_LIMIT ? parseInt(process.env.TEST_LIMIT) : null;
const CACHE_FILE = `./cache/sleepy-hollow-${CEFR_LEVEL}-simplified.json`;
const INPUT_FILE = 'data/sleepy-hollow/modernized.txt';

// Lesson #29: Lock text version with hash before audio generation
function generateContentHash(text) {
  return crypto.createHash('sha256').update(text).digest('hex').substring(0, 16);
}

async function simplifySleepyHollow() {
  console.log(`📚 Starting Sleepy Hollow simplification to ${CEFR_LEVEL} level...`);
  if (TEST_LIMIT) {
    console.log(`🧪 TEST MODE: Limited to first ${TEST_LIMIT} sentences`);
  }

  // Check for cached results first (Lesson #14: Always cache expensive API operations)
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
    const chunkText = chunk.map(s => s.text).join(' ');

    console.log(`Simplifying sentences ${i + 1}-${Math.min(i + chunkSize, sentencesToProcess.length)}...`);

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: `You are a language simplification expert. Simplify the following text to ${CEFR_LEVEL} level.

MANDATORY REQUIREMENT: The input has EXACTLY ${chunk.length} sentences. You MUST return EXACTLY ${chunk.length} sentences.
- If a sentence is too long, simplify it but keep it as ONE sentence
- If a sentence is too short, keep it as ONE sentence
- NEVER merge two sentences into one
- NEVER split one sentence into two
- Count periods (.), exclamation marks (!), and question marks (?) - there must be EXACTLY ${chunk.length} of them

Guidelines for ${CEFR_LEVEL}:
${getGuidelinesForLevel(CEFR_LEVEL)}

Additional rules:
- Preserve all story details and plot points
- Keep character names and place names unchanged
- This is the FINAL text version - will be used for audio generation

Return ONLY the simplified text with EXACTLY ${chunk.length} sentences`
          },
          {
            role: 'user',
            content: chunkText
          }
        ],
        temperature: 0.3,
        max_tokens: 1500
      });

      const simplifiedChunk = response.choices[0].message.content;
      const simplifiedChunkSentences = splitIntoSentences(simplifiedChunk);

      // Validate sentence count matches (Lesson #34: Missing Words = Data Loss)
      if (simplifiedChunkSentences.length !== chunk.length) {
        console.error(`❌ FAILED: Expected ${chunk.length} sentences, got ${simplifiedChunkSentences.length}`);
        throw new Error('Sentence count must match exactly for perfect audio-text harmony');
      }

      simplifiedSentences.push(...simplifiedChunkSentences);

      // Save progress after each chunk (prevents data loss)
      saveProgressToCache(simplifiedSentences);

      // Small delay to respect API rate limits
      await new Promise(resolve => setTimeout(resolve, 500));

    } catch (error) {
      console.error(`❌ Error processing chunk ${i / chunkSize + 1}:`, error.message);

      // If we have partial progress, save it
      if (simplifiedSentences.length > 0) {
        saveProgressToCache(simplifiedSentences);
        console.log(`💾 Saved ${simplifiedSentences.length} sentences before error`);
      }
      throw error;
    }
  }

  // Join all simplified text
  const simplifiedText = simplifiedSentences.map(s => s.text).join(' ');

  // Generate content hash for version control (Lesson #29)
  const contentHash = generateContentHash(simplifiedText);
  console.log(`🔒 Content hash: ${contentHash}`);

  // Save final cache with metadata
  const finalCache = {
    sentences: simplifiedSentences,
    metadata: {
      bookId: BOOK_ID,
      cefrLevel: CEFR_LEVEL,
      contentHash: contentHash,
      sentenceCount: simplifiedSentences.length,
      processedAt: new Date().toISOString(),
      sourceFile: INPUT_FILE
    }
  };
  fs.writeFileSync(CACHE_FILE, JSON.stringify(finalCache, null, 2));
  console.log(`✅ Final cache saved with ${simplifiedSentences.length} sentences`);

  // Store in database
  await storeInDatabase(simplifiedText, contentHash, simplifiedSentences.length);

  console.log(`✅ Simplification complete! ${sentencesToProcess.length} sentences simplified to ${CEFR_LEVEL} level`);
  console.log(`🔒 Text frozen with hash: ${contentHash}`);
  console.log(`\nNext step: Generate audio bundles with:`);
  console.log(`CEFR_LEVEL=${CEFR_LEVEL} node scripts/generate-sleepy-hollow-bundles.js`);
}

function splitIntoSentences(text) {
  const sentences = [];
  const rawSentences = text.split(/([.!?]+\s+)/);

  let currentSentence = '';
  for (let i = 0; i < rawSentences.length; i++) {
    currentSentence += rawSentences[i];

    if (/[.!?]+\s*$/.test(currentSentence) && currentSentence.trim().length > 20) {
      const trimmed = currentSentence.trim();
      // Skip title and author lines
      if (!trimmed.includes('The Legend of Sleepy Hollow') &&
          !trimmed.includes('Washington Irving') &&
          !trimmed.includes('CASTLE OF INDOLENCE')) {
        sentences.push({
          index: sentences.length,
          text: trimmed,
          sentenceId: `sleepy_hollow_${sentences.length}` // Track sentence IDs
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
           - Clear standard language (10-15 words per sentence)
           - Can handle abstract concepts if explained
           - Avoid complex subordinate clauses`,
    'B2': `- Use complex grammar including passive voice
           - Vocabulary: 3000-4000 words
           - Longer sentences with subordinate clauses
           - Can handle most topics with clarity`
  };

  return guidelines[level] || guidelines['B1'];
}

function saveProgressToCache(sentences) {
  const progressCache = {
    sentences: sentences,
    metadata: {
      bookId: BOOK_ID,
      cefrLevel: CEFR_LEVEL,
      inProgress: true,
      savedAt: new Date().toISOString()
    }
  };
  fs.writeFileSync(CACHE_FILE, JSON.stringify(progressCache, null, 2));
}

async function storeCachedResults(cachedData) {
  console.log('💾 Storing cached results in database...');

  // Handle both old format (array) and new format (object with metadata)
  const sentences = Array.isArray(cachedData) ? cachedData : cachedData.sentences;
  const simplifiedText = sentences.map(s => s.text).join(' ');
  const contentHash = generateContentHash(simplifiedText);

  await storeInDatabase(simplifiedText, contentHash, sentences.length);

  console.log('✅ Cached results stored in database!');
  console.log(`🔒 Content hash: ${contentHash}`);
}

async function storeInDatabase(simplifiedText, contentHash, sentenceCount) {
  console.log('💾 Storing simplification in database...');

  await prisma.bookSimplification.upsert({
    where: {
      bookId_targetLevel_chunkIndex_versionKey: {
        bookId: BOOK_ID,
        targetLevel: CEFR_LEVEL,
        chunkIndex: 0,
        versionKey: 'v1'
      }
    },
    update: {
      simplifiedText: simplifiedText,
      vocabularyChanges: [{ contentHash, sentenceCount }] // Store metadata in JSON field
    },
    create: {
      bookId: BOOK_ID,
      targetLevel: CEFR_LEVEL,
      chunkIndex: 0,
      originalText: 'Modernized Sleepy Hollow',
      simplifiedText: simplifiedText,
      vocabularyChanges: [{ contentHash, sentenceCount }],
      culturalAnnotations: [],
      qualityScore: null,
      versionKey: 'v1'
    }
  });

  // Also store in BookContent for bundle generation
  await prisma.bookContent.upsert({
    where: { bookId: BOOK_ID },
    update: {
      title: 'The Legend of Sleepy Hollow (Enhanced)',
      author: 'Washington Irving',
      fullText: simplifiedText.substring(0, 50000),
      era: 'classic-modernized',
      wordCount: simplifiedText.split(/\s+/).length,
      totalChunks: Math.ceil(sentenceCount / 4), // 4 sentences per bundle
      updatedAt: new Date()
    },
    create: {
      bookId: BOOK_ID,
      title: 'The Legend of Sleepy Hollow (Enhanced)',
      author: 'Washington Irving',
      fullText: simplifiedText.substring(0, 50000),
      era: 'classic-modernized',
      wordCount: simplifiedText.split(/\s+/).length,
      totalChunks: Math.ceil(sentenceCount / 4)
    }
  });

  console.log('✅ Database storage complete!');
}

// Run the simplification
simplifySleepyHollow()
  .then(() => {
    console.log('🎉 Done!');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Error:', error);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });