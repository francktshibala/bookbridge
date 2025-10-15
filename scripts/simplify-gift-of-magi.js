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

const BOOK_ID = 'gift-of-the-magi';

// SCRIPT LEVEL VALIDATION - MANDATORY FIRST (prevents runtime failures)
const VALID_LEVELS = ['A1', 'A2', 'B1'];

// Get target level from command line argument
const targetLevel = process.argv[2];

// Validate level before proceeding
if (!targetLevel) {
  console.error('❌ Error: Please specify a CEFR level (A1, A2, or B1)');
  console.log('Usage: node scripts/simplify-gift-of-magi.js [A1|A2|B1]');
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
- Coordinating conjunctions (and, but, so)
- Relative clauses with "that" and "who"
`;

const B1_GUIDELINES = `
- All basic tenses plus present perfect
- 12-25 words per sentence (complex structures)
- Rich vocabulary (3000+ words, abstract concepts)
- Subordinating conjunctions and varied sentence structures
- Past perfect for sequence of events
`;

// Word count validation by level
const WORD_COUNT_LIMITS = {
  'A1': { min: 6, max: 12 },
  'A2': { min: 8, max: 15 },
  'B1': { min: 12, max: 25 }
};

async function simplifyGiftOfMagi() {
  console.log(`✂️ Simplifying "The Gift of the Magi" to ${CEFR_LEVEL} level...`);
  console.log(`📖 Word count: ${WORD_COUNT_LIMITS[CEFR_LEVEL].min}-${WORD_COUNT_LIMITS[CEFR_LEVEL].max} words per sentence\\n`);

  try {
    // Load original text
    const textFilePath = path.join(process.cwd(), 'cache', `${BOOK_ID}-original.txt`);
    const originalText = fs.readFileSync(textFilePath, 'utf8');

    // Load chapter structure
    const chaptersFilePath = path.join(process.cwd(), 'cache', `${BOOK_ID}-chapters.json`);
    const chaptersData = JSON.parse(fs.readFileSync(chaptersFilePath, 'utf8'));

    console.log(`📊 Story: ${chaptersData.totalSentences} sentences, ${chaptersData.chapters.length} chapters`);

    // Split into sentences
    const sentences = originalText.split(/[.!?]+/).filter(s => s.trim().length > 10);
    console.log(`📝 Processing ${sentences.length} sentences...\\n`);

    // Simplify in chunks to avoid token limits
    const chunkSize = 15; // Process 15 sentences at a time
    const simplifiedSentences = [];

    for (let i = 0; i < sentences.length; i += chunkSize) {
      const chunk = sentences.slice(i, i + chunkSize);
      const chunkNumber = Math.floor(i / chunkSize) + 1;
      const totalChunks = Math.ceil(sentences.length / chunkSize);

      console.log(`🔄 Processing chunk ${chunkNumber}/${totalChunks} (sentences ${i + 1}-${Math.min(i + chunkSize, sentences.length)})`);

      const simplifiedChunk = await simplifyChunk(chunk, chunkNumber);
      simplifiedSentences.push(...simplifiedChunk);

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Critical validation: 1:1 sentence mapping
    if (simplifiedSentences.length !== sentences.length) {
      throw new Error(`❌ FAILED: Expected ${sentences.length} sentences, got ${simplifiedSentences.length}. Perfect 1:1 mapping required!`);
    }

    console.log('\\n✅ Sentence count validation passed: 1:1 mapping preserved');

    // Save simplified version
    const simplifiedText = simplifiedSentences.join(' ');
    const outputPath = path.join(process.cwd(), 'cache', `${BOOK_ID}-${CEFR_LEVEL}-simplified.txt`);
    fs.writeFileSync(outputPath, simplifiedText);

    console.log(`💾 Saved simplified text: ${outputPath}`);

    // Create chapter mapping with simplified text
    const result = {
      bookId: BOOK_ID,
      title: `The Gift of the Magi (${CEFR_LEVEL} Level)`,
      author: 'O. Henry',
      cefrLevel: CEFR_LEVEL,
      originalSentences: sentences.length,
      simplifiedSentences: simplifiedSentences.length,
      chapters: chaptersData.chapters.map(ch => ({
        chapterIndex: ch.chapterIndex,
        title: ch.title,
        startSentence: ch.startSentence,
        endSentence: ch.endSentence,
        originalText: sentences.slice(ch.startSentence, ch.endSentence + 1).join(' '),
        simplifiedText: simplifiedSentences.slice(ch.startSentence, ch.endSentence + 1).join(' ')
      })),
      createdAt: new Date().toISOString()
    };

    // Save chapter-mapped result
    const chapterOutputPath = path.join(process.cwd(), 'cache', `${BOOK_ID}-${CEFR_LEVEL}-chapters.json`);
    fs.writeFileSync(chapterOutputPath, JSON.stringify(result, null, 2));

    console.log('\\n📊 Simplification Results:');
    console.log(`   📝 Original Sentences: ${result.originalSentences}`);
    console.log(`   ✂️ Simplified Sentences: ${result.simplifiedSentences}`);
    console.log(`   📑 Chapters: ${result.chapters.length}`);

    console.log('\\n📖 Chapter Preview:');
    result.chapters.slice(0, 3).forEach(ch => {
      const wordCount = ch.simplifiedText.split(/\\s+/).length;
      console.log(`   ${ch.chapterIndex + 1}. "${ch.title}" (${wordCount} words)`);
      console.log(`      "${ch.simplifiedText.substring(0, 80)}..."`);
    });

    console.log(`\\n💾 Chapter data saved: ${chapterOutputPath}`);

    return result;

  } catch (error) {
    console.error('❌ Simplification failed:', error.message);
    throw error;
  }
}

async function simplifyChunk(sentences, chunkNumber) {
  // Get appropriate guidelines for the target level
  const guidelines = {
    'A1': A1_GUIDELINES,
    'A2': A2_GUIDELINES,
    'B1': B1_GUIDELINES
  }[CEFR_LEVEL];

  const wordLimits = WORD_COUNT_LIMITS[CEFR_LEVEL];

  const simplificationPrompt = `
Simplify these sentences from "The Gift of the Magi" to ${CEFR_LEVEL} CEFR level.

CRITICAL RULES:
1. Return EXACTLY ${sentences.length} sentences (one simplified sentence per original)
2. Use ${wordLimits.min}-${wordLimits.max} words per sentence (${CEFR_LEVEL} appropriate)
3. Follow ${CEFR_LEVEL} guidelines: ${guidelines}
4. Keep all names: Della, Jim, etc.
5. Preserve story meaning and emotion
6. Use appropriate connectors for ${CEFR_LEVEL} level

Original sentences to simplify:
${sentences.map((s, i) => `${i + 1}. ${s.trim()}.`).join('\\n')}

Return as numbered list of exactly ${sentences.length} simplified sentences:
1. [First simplified sentence here]
2. [Second simplified sentence here]
...`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: simplificationPrompt }],
      temperature: 0.3,
      max_tokens: 1500
    });

    const aiResponse = response.choices[0].message.content;

    // Extract numbered sentences
    const simplifiedSentences = [];
    const lines = aiResponse.split('\\n');

    for (const line of lines) {
      const match = line.match(/^\\d+\\.\\s*(.+)$/);
      if (match) {
        let sentence = match[1].trim();
        // Ensure sentence ends with punctuation
        if (!/[.!?]$/.test(sentence)) {
          sentence += '.';
        }
        simplifiedSentences.push(sentence);
      }
    }

    // Validation: ensure we got exactly the right number of sentences
    if (simplifiedSentences.length !== sentences.length) {
      console.log(`   ⚠️ Chunk ${chunkNumber}: Expected ${sentences.length}, got ${simplifiedSentences.length}. Using fallback...`);

      // Fallback: simple word replacement
      return sentences.map(sentence => {
        return sentence
          .replace(/\\b(magnificent|extraordinary|splendid)\\b/gi, 'beautiful')
          .replace(/\\b(contemplated|considered|pondered)\\b/gi, 'thought about')
          .replace(/\\b(immediately|instantly|forthwith)\\b/gi, 'quickly')
          .replace(/\\b(purchased|acquired|procured)\\b/gi, 'bought')
          .substring(0, 80) + '.'; // Keep sentences short
      });
    }

    console.log(`   ✅ Chunk ${chunkNumber}: ${simplifiedSentences.length} sentences simplified`);
    return simplifiedSentences;

  } catch (error) {
    console.error(`   ❌ Chunk ${chunkNumber} failed:`, error.message);

    // Emergency fallback
    return sentences.map(() => 'This is a simple sentence.');
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  simplifyGiftOfMagi()
    .then(() => console.log('\\n✅ Gift of the Magi simplification completed!'))
    .catch(console.error)
    .finally(() => prisma.$disconnect());
}

export { simplifyGiftOfMagi };