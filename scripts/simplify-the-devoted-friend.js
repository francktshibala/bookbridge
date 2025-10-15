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

const BOOK_ID = 'the-devoted-friend';

// SCRIPT LEVEL VALIDATION - MANDATORY FIRST (prevents runtime failures)
const VALID_LEVELS = ['A1', 'A2', 'B1'];

// Get target level from command line argument
const targetLevel = process.argv[2];

// Validate level before proceeding
if (!targetLevel) {
  console.error('❌ Error: Please specify a CEFR level (A1, A2, or B1)');
  console.log('Usage: node scripts/simplify-the-devoted-friend.js [A1|A2|B1]');
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
const INPUT_FILE = path.join(CACHE_DIR, `${BOOK_ID}-original.txt`);
const CACHE_FILE = path.join(CACHE_DIR, `${BOOK_ID}-${CEFR_LEVEL}-simplified.json`);

async function simplifyTheDevotedFriend() {
  console.log(`📚 Simplifying "The Devoted Friend" to ${CEFR_LEVEL} level...`);

  // Check if we should use cached results
  const shouldUseFresh = process.argv.includes('--fresh');

  if (fs.existsSync(CACHE_FILE) && !shouldUseFresh) {
    console.log('📄 Found existing simplified cache. Use --fresh to regenerate.');
    const cachedData = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
    console.log(`✅ Using cached simplified text: ${cachedData.sentences.length} sentences`);
    await saveToDatabases(cachedData.sentences);
    return cachedData.sentences;
  }

  // Read original text
  if (!fs.existsSync(INPUT_FILE)) {
    throw new Error(`Original text file not found: ${INPUT_FILE}. Run fetch script first.`);
  }

  const originalText = fs.readFileSync(INPUT_FILE, 'utf8');
  console.log(`📖 Original text loaded: ${originalText.length} characters`);

  // Split into sentences
  const sentences = originalText.match(/[^.!?]+[.!?]+/g) || [];
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

${CEFR_LEVEL} GUIDELINES:${guidelines[CEFR_LEVEL]}

SENTENCE STRUCTURE EXAMPLES:
${CEFR_LEVEL === 'A1' ? `
- GOOD: "The man is tall and walks to his home quickly." (9 words)
- BAD: "The man is tall. He walks. He goes home." (micro-sentences)
` : CEFR_LEVEL === 'A2' ? `
- GOOD: "The man is tall and walks fast, then goes home because he is tired." (13 words)
- BAD: "The man who is tall walks fast to his home because he feels tired today." (15+ words)
` : `
- GOOD: "The tall man walks quickly to his home because he feels tired after work." (13 words)
- Complex structures allowed with proper connectors
`}

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

      // Parse JSON response with multiple strategies
      let simplifiedChunk;
      try {
        simplifiedChunk = JSON.parse(responseText);
      } catch (e) {
        // Try to extract JSON array from response
        const jsonMatch = responseText.match(/\[(.*?)\]/s);
        if (jsonMatch) {
          simplifiedChunk = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('Could not parse JSON response');
        }
      }

      // Validate sentence count
      if (simplifiedChunk.length !== chunk.length) {
        console.warn(`⚠️ Sentence count mismatch: expected ${chunk.length}, got ${simplifiedChunk.length}`);
        // Auto-correct by padding or truncating
        if (simplifiedChunk.length < chunk.length) {
          // Pad with last sentence repeated
          while (simplifiedChunk.length < chunk.length) {
            simplifiedChunk.push(simplifiedChunk[simplifiedChunk.length - 1]);
          }
        } else {
          // Truncate to correct length
          simplifiedChunk = simplifiedChunk.slice(0, chunk.length);
        }
      }

      // Add to results
      simplifiedChunk.forEach((text, idx) => {
        simplifiedSentences.push({
          sentenceIndex: simplifiedSentences.length,
          text: text.trim()
        });
      });

      processedChunks++;
      console.log(`✅ Chunk ${processedChunks} complete: ${simplifiedChunk.length} sentences`);

      // Save progress to cache after each chunk
      const progressData = {
        bookId: BOOK_ID,
        cefrLevel: CEFR_LEVEL,
        sentences: simplifiedSentences,
        totalChunks: chunks.length,
        completedChunks: processedChunks,
        metadata: {
          inProgress: processedChunks < chunks.length,
          savedAt: new Date().toISOString()
        }
      };

      fs.writeFileSync(CACHE_FILE, JSON.stringify(progressData, null, 2));

      // Small delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 1000));

    } catch (error) {
      console.error(`❌ Failed to process chunk ${processedChunks + 1}:`, error.message);
      console.log('💾 Progress saved to cache. You can resume by running the script again.');
      throw error;
    }
  }

  console.log(`\n✅ Simplification complete: ${simplifiedSentences.length} sentences`);

  // Final save to cache
  const finalData = {
    bookId: BOOK_ID,
    cefrLevel: CEFR_LEVEL,
    sentences: simplifiedSentences,
    metadata: {
      inProgress: false,
      completedAt: new Date().toISOString()
    }
  };

  fs.writeFileSync(CACHE_FILE, JSON.stringify(finalData, null, 2));
  console.log(`💾 Saved simplified text to cache: ${CACHE_FILE}`);

  // Save to database
  await saveToDatabases(simplifiedSentences);

  return simplifiedSentences;
}

async function saveToDatabases(sentences) {
  console.log('\n💾 Saving to database...');

  try {
    const fullText = sentences.map(s => s.text).join(' ');

    // Save to BookSimplification table
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
        simplifiedText: fullText
      },
      create: {
        bookId: BOOK_ID,
        targetLevel: CEFR_LEVEL,
        chunkIndex: 0,
        originalText: 'Full original text',
        simplifiedText: fullText,
        vocabularyChanges: [],
        culturalAnnotations: [],
        qualityScore: null,
        versionKey: 'v1'
      }
    });

    console.log('✅ Saved to BookSimplification table');

    // Create Book record if it doesn't exist
    await prisma.book.upsert({
      where: { bookId: BOOK_ID },
      update: {},
      create: {
        bookId: BOOK_ID,
        title: 'The Devoted Friend',
        author: 'Oscar Wilde',
        era: 'Victorian',
        genre: 'Fairy Tale',
        originalLanguage: 'English',
        publicationYear: 1888
      }
    });

    console.log('✅ Book record created/updated');

    // Create BookContent record
    await prisma.bookContent.upsert({
      where: { bookId: BOOK_ID },
      update: {
        fullText: fullText,
        wordCount: fullText.split(' ').length,
        totalChunks: 1
      },
      create: {
        bookId: BOOK_ID,
        title: 'The Devoted Friend',
        author: 'Oscar Wilde',
        fullText: fullText,
        era: 'Victorian',
        wordCount: fullText.split(' ').length,
        totalChunks: 1
      }
    });

    console.log('✅ BookContent record created/updated');
    console.log(`📊 Total sentences: ${sentences.length}`);
    console.log(`📊 Total words: ${fullText.split(' ').length}`);

  } catch (error) {
    console.error('❌ Database save failed:', error.message);
    console.log('💾 Simplified text is saved in cache and can be recovered');
    throw error;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  simplifyTheDevotedFriend()
    .then(() => console.log(`\n✅ The Devoted Friend simplified to ${CEFR_LEVEL} level successfully!`))
    .catch(console.error)
    .finally(() => prisma.$disconnect());
}

export { simplifyTheDevotedFriend };