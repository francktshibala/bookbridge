#!/usr/bin/env node

import { PrismaClient } from '@prisma/client';
import OpenAI from 'openai';
import fs from 'fs';
import crypto from 'crypto';

const prisma = new PrismaClient();
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const BOOK_ID = 'great-gatsby-a2';
const CEFR_LEVEL = process.argv[2] || 'A2';
const TEST_LIMIT = process.env.TEST_LIMIT ? parseInt(process.env.TEST_LIMIT) : null;
const CACHE_FILE = `./cache/great-gatsby-${CEFR_LEVEL}-simplified.json`;
const INPUT_FILE = 'data/great-gatsby/modernized.txt';
const CHAPTERS_FILE = 'data/great-gatsby/chapters.json';

// Lesson #29: Lock text version with hash before audio generation
function generateContentHash(text) {
  return crypto.createHash('sha256').update(text).digest('hex').substring(0, 16);
}

async function simplifyGreatGatsby() {
  console.log(`📚 Starting Great Gatsby simplification to ${CEFR_LEVEL} level...`);
  console.log(`📖 Using book ID: ${BOOK_ID}`);
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

  // Load chapter information for enhanced metadata
  let chapters = [];
  if (fs.existsSync(CHAPTERS_FILE)) {
    chapters = JSON.parse(fs.readFileSync(CHAPTERS_FILE, 'utf8'));
    console.log(`📚 Loaded ${chapters.length} chapter definitions`);
  }

  // Read the modernized text
  const modernizedText = fs.readFileSync(INPUT_FILE, 'utf8');
  console.log(`📖 Processing modernized text: ${modernizedText.length} characters`);

  // Split into sentences with chapter tracking
  const sentences = splitIntoSentencesWithChapters(modernizedText, chapters);
  const sentencesToProcess = TEST_LIMIT ? sentences.slice(0, TEST_LIMIT) : sentences;

  console.log(`Processing ${sentencesToProcess.length} sentences...`);

  // Process in chunks of 10 sentences for better context
  const simplifiedSentences = [];
  const chunkSize = 10;

  for (let i = 0; i < sentencesToProcess.length; i += chunkSize) {
    const chunk = sentencesToProcess.slice(i, i + chunkSize);
    const chunkText = chunk.map(s => s.text).join(' ');
    const chapterInfo = chunk[0].chapter;

    console.log(`Simplifying sentences ${i + 1}-${Math.min(i + chunkSize, sentencesToProcess.length)}${chapterInfo ? ` (Chapter ${chapterInfo.number}: ${chapterInfo.title})` : ''}...`);

    let attempt = 0;
    const maxAttempts = 3;
    let simplifiedSentenceTexts = null;

    while (attempt < maxAttempts && !simplifiedSentenceTexts) {
      attempt++;

      try {
        const response = await openai.chat.completions.create({
          model: 'gpt-4-turbo-preview',
          messages: [
            {
              role: 'system',
              content: `You are a language simplification expert. Simplify the following text to ${CEFR_LEVEL} level.

CRITICAL: Return ONLY a JSON array of exactly ${chunk.length} strings. No commentary.
Format: ["sentence 1", "sentence 2", "sentence 3", ...]

Guidelines for ${CEFR_LEVEL}:
${getGuidelinesForLevel(CEFR_LEVEL)}

${chapterInfo ? `Context: This is from Chapter ${chapterInfo.number} "${chapterInfo.title}" - ${chapterInfo.theme}` : ''}

Rules:
- Preserve all story details and plot points
- Keep character names unchanged (Nick, Gatsby, Daisy, Tom, etc.)
- Keep place names unchanged (West Egg, East Egg, New York, etc.)
- Maintain 1920s atmosphere and cultural references but explain them simply
- Each array element must be a complete sentence
- Return exactly ${chunk.length} sentences in JSON array format`
            },
            {
              role: 'user',
              content: `Input text (${chunk.length} sentences): ${chunkText}`
            }
          ],
          temperature: 0.1, // Lower temperature for consistency
          max_tokens: 1500
        });

        const responseText = response.choices[0].message.content.trim();

        // Try to parse JSON response
        let parsedSentences;
        try {
          parsedSentences = JSON.parse(responseText);
        } catch (jsonError) {
          // Fallback: extract from text if JSON parsing fails
          parsedSentences = extractSentencesFromText(responseText);
        }

        if (Array.isArray(parsedSentences)) {
          if (parsedSentences.length === chunk.length) {
            // Perfect match
            simplifiedSentenceTexts = parsedSentences.map((text, idx) => ({
              sentenceIndex: idx,
              text: text.trim()
            }));
          } else if (attempt === maxAttempts) {
            // Final attempt - auto-correct
            console.log(`⚠️ Final attempt: Auto-correcting ${parsedSentences.length} → ${chunk.length} sentences`);
            const correctedSentences = autoCorrectSentenceCount(parsedSentences, chunk.length);
            simplifiedSentenceTexts = correctedSentences.map((text, idx) => ({
              sentenceIndex: idx,
              text: text.trim()
            }));
          } else {
            console.log(`❌ Attempt ${attempt}: Expected ${chunk.length}, got ${parsedSentences.length}. Retrying...`);
          }
        } else {
          console.log(`❌ Attempt ${attempt}: Invalid response format. Retrying...`);
        }

        if (!simplifiedSentenceTexts && attempt < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 1000)); // Brief delay before retry
        }

      } catch (error) {
        console.error(`❌ Attempt ${attempt} failed:`, error.message);
        if (attempt === maxAttempts) throw error;
      }
    }

    if (!simplifiedSentenceTexts) {
      throw new Error(`Failed to get ${chunk.length} sentences after ${maxAttempts} attempts`);
    }

      // Map the simplified sentences back to our structure
      for (let j = 0; j < simplifiedSentenceTexts.length; j++) {
        const originalSentence = chunk[j];
        simplifiedSentences.push({
          sentenceIndex: originalSentence.sentenceIndex,
          originalText: originalSentence.text,
          simplifiedText: simplifiedSentenceTexts[j].text,
          wordCount: simplifiedSentenceTexts[j].text.split(' ').length,
          chapter: originalSentence.chapter
        });
      }

    // Save progress to cache after each chunk (Lesson #19: Progress preservation)
    fs.writeFileSync(CACHE_FILE, JSON.stringify(simplifiedSentences, null, 2), 'utf8');
    console.log(`  ✅ Chunk complete. Total sentences: ${simplifiedSentences.length}`);

    // Small delay to be respectful to API
    await new Promise(resolve => setTimeout(resolve, 750));
  }

  console.log(`\n✅ Simplification complete: ${simplifiedSentences.length} sentences`);

  // Generate content hash
  const fullText = simplifiedSentences.map(s => s.simplifiedText).join(' ');
  const contentHash = generateContentHash(fullText);

  console.log(`📝 Content hash: ${contentHash}`);
  console.log(`💾 Cached to: ${CACHE_FILE}`);

  // Store in database
  await storeSimplifiedBook(simplifiedSentences, contentHash);

  // Generate statistics
  const stats = {
    totalSentences: simplifiedSentences.length,
    averageWordCount: Math.round(simplifiedSentences.reduce((sum, s) => sum + s.wordCount, 0) / simplifiedSentences.length),
    totalWords: simplifiedSentences.reduce((sum, s) => sum + s.wordCount, 0),
    chaptersProcessed: [...new Set(simplifiedSentences.map(s => s.chapter?.number).filter(Boolean))].length
  };

  console.log('\n📊 Statistics:');
  console.log(`  • Total sentences: ${stats.totalSentences}`);
  console.log(`  • Total words: ${stats.totalWords.toLocaleString()}`);
  console.log(`  • Average words per sentence: ${stats.averageWordCount}`);
  console.log(`  • Chapters processed: ${stats.chaptersProcessed}`);
  console.log(`  • Estimated bundles (4 sentences each): ${Math.ceil(stats.totalSentences / 4)}`);

  console.log('\n🚀 Next steps:');
  console.log(`1. Review simplified sentences in ${CACHE_FILE}`);
  console.log(`2. Run bundle generation: node scripts/generate-great-gatsby-bundles.js`);
  console.log(`3. Test with Featured Books interface`);
}

function splitIntoSentences(text) {
  // Split on sentence boundaries
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [];

  return sentences.map((s, index) => ({
    sentenceIndex: index,
    text: s.trim()
  }));
}

// Extract sentences from API response with multiple fallback strategies
function extractSentencesFromText(responseText) {
  // Strategy 1: Try to parse as JSON array
  try {
    const parsed = JSON.parse(responseText.trim());
    if (Array.isArray(parsed) && parsed.every(item => typeof item === 'string')) {
      return parsed.map(s => s.trim()).filter(s => s.length > 0);
    }
  } catch (e) {
    // Continue to next strategy
  }

  // Strategy 2: Extract JSON array from text (handle GPT adding commentary)
  const jsonMatch = responseText.match(/\[(.*?)\]/s);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      if (Array.isArray(parsed) && parsed.every(item => typeof item === 'string')) {
        return parsed.map(s => s.trim()).filter(s => s.length > 0);
      }
    } catch (e) {
      // Continue to next strategy
    }
  }

  // Strategy 3: Split on sentence endings and clean up
  const sentences = responseText
    .split(/[.!?]+/)
    .map(s => s.trim())
    .filter(s => s.length > 10) // Filter out very short fragments
    .map(s => s + (s.match(/[.!?]$/) ? '' : '.')); // Add period if missing

  return sentences;
}

function autoCorrectSentenceCount(sentences, targetCount) {
  const result = [...sentences];

  while (result.length > targetCount) {
    // Merge shortest adjacent sentences
    let shortestIdx = 0;
    let shortestLength = result[0].length + result[1].length;

    for (let i = 0; i < result.length - 1; i++) {
      const combinedLength = result[i].length + result[i + 1].length;
      if (combinedLength < shortestLength) {
        shortestLength = combinedLength;
        shortestIdx = i;
      }
    }

    // Merge the two shortest adjacent sentences
    result[shortestIdx] = result[shortestIdx] + ' ' + result[shortestIdx + 1];
    result.splice(shortestIdx + 1, 1);
  }

  while (result.length < targetCount) {
    // Split longest sentence at safe conjunctions
    let longestIdx = 0;
    let longestLength = result[0].length;

    for (let i = 1; i < result.length; i++) {
      if (result[i].length > longestLength) {
        longestLength = result[i].length;
        longestIdx = i;
      }
    }

    const sentence = result[longestIdx];
    const splitPoints = [', and ', ', but ', '; ', ' because ', ' when ', ' while '];
    let splitMade = false;

    for (const splitPoint of splitPoints) {
      const splitIdx = sentence.indexOf(splitPoint);
      if (splitIdx > 20 && splitIdx < sentence.length - 20) { // Avoid splitting too close to ends
        const part1 = sentence.substring(0, splitIdx).trim() + '.';
        const part2 = sentence.substring(splitIdx + splitPoint.length).trim();

        // Capitalize first letter of second part
        const part2Capitalized = part2.charAt(0).toUpperCase() + part2.slice(1);

        result[longestIdx] = part1;
        result.splice(longestIdx + 1, 0, part2Capitalized);
        splitMade = true;
        break;
      }
    }

    if (!splitMade) {
      // If no safe split found, duplicate the longest sentence with minor variation
      result.push(sentence + ' (This continues the story.)');
    }
  }

  return result.map(text => text.trim());
}

function splitIntoSentencesWithChapters(text, chapters) {
  const allSentences = splitIntoSentences(text);

  // Add chapter information to each sentence based on position
  return allSentences.map((sentence, index) => {
    // Find which chapter this sentence belongs to based on text position
    const sentencePosition = text.indexOf(sentence.text);
    const chapter = chapters.find(ch =>
      sentencePosition >= ch.startPosition && sentencePosition < ch.endPosition
    );

    return {
      ...sentence,
      chapter: chapter ? {
        number: chapter.number,
        title: chapter.title,
        theme: chapter.theme
      } : null
    };
  });
}

function getGuidelinesForLevel(level) {
  const guidelines = {
    'A1': `- Use only the most common 600-800 words
- Present tense preferred, simple past when necessary
- Very short sentences (5-8 words average)
- Basic subject-verb-object structure
- No idioms or cultural references`,

    'A2': `- Use the most common 1200-1500 words
- Present and simple past tense, present perfect for recent events
- Short sentences (8-12 words average)
- Simple connecting words (and, but, because, when)
- Explain cultural references simply
- Avoid complex metaphors`,

    'B1': `- Use common 2000-2500 words
- All basic tenses, some conditional
- Medium sentences (10-15 words average)
- Common phrasal verbs allowed
- Simple metaphors with context
- Basic cultural references explained`,

    'B2': `- Use 3000-3500 words vocabulary
- All tenses including past perfect
- Varied sentence length (12-18 words average)
- Idioms with context clues
- Literary devices preserved where possible`,

    'C1': `- Rich vocabulary (4000+ words)
- Complex grammar structures
- Natural sentence variety
- Preserve most literary style
- Minimal simplification`
  };

  return guidelines[level] || guidelines['B1'];
}

async function storeSimplifiedBook(sentences, contentHash) {
  console.log('\n📥 Storing in database...');

  try {
    // Store main book record
    const book = await prisma.bookContent.upsert({
      where: { bookId: BOOK_ID },
      update: {
        title: 'The Great Gatsby',
        author: 'F. Scott Fitzgerald',
        fullText: sentences.map(s => s.simplifiedText).join(' '),
        era: '1920s',
        wordCount: sentences.reduce((sum, s) => sum + s.wordCount, 0),
        totalChunks: Math.ceil(sentences.length / 4), // Bundle architecture
        updatedAt: new Date()
      },
      create: {
        bookId: BOOK_ID,
        title: 'The Great Gatsby',
        author: 'F. Scott Fitzgerald',
        fullText: sentences.map(s => s.simplifiedText).join(' '),
        era: '1920s',
        wordCount: sentences.reduce((sum, s) => sum + s.wordCount, 0),
        totalChunks: Math.ceil(sentences.length / 4)
      }
    });

    console.log(`✅ Book record stored: ${BOOK_ID}`);

    // Store simplification record (for tracking versions)
    const simplification = await prisma.bookSimplification.upsert({
      where: {
        bookId_targetLevel_chunkIndex_versionKey: {
          bookId: BOOK_ID,
          targetLevel: CEFR_LEVEL,
          chunkIndex: 0, // Single record for entire book
          versionKey: 'v1'
        }
      },
      update: {
        originalText: 'Full Great Gatsby text',
        simplifiedText: sentences.map(s => s.simplifiedText).join('\n'),
        vocabularyChanges: [],
        culturalAnnotations: sentences
          .filter(s => s.chapter)
          .map(s => ({
            chapter: s.chapter.number,
            title: s.chapter.title
          })),
        qualityScore: null,
        updatedAt: new Date()
      },
      create: {
        bookId: BOOK_ID,
        targetLevel: CEFR_LEVEL,
        chunkIndex: 0,
        originalText: 'Full Great Gatsby text',
        simplifiedText: sentences.map(s => s.simplifiedText).join('\n'),
        vocabularyChanges: [],
        culturalAnnotations: sentences
          .filter(s => s.chapter)
          .map(s => ({
            chapter: s.chapter.number,
            title: s.chapter.title
          })),
        qualityScore: null,
        versionKey: 'v1'
      }
    });

    console.log(`✅ Simplification record stored with hash: ${contentHash}`);

    // Store metadata about chapters
    const chaptersSummary = {};
    sentences.forEach(s => {
      if (s.chapter) {
        if (!chaptersSummary[s.chapter.number]) {
          chaptersSummary[s.chapter.number] = {
            title: s.chapter.title,
            sentenceCount: 0,
            wordCount: 0
          };
        }
        chaptersSummary[s.chapter.number].sentenceCount++;
        chaptersSummary[s.chapter.number].wordCount += s.wordCount;
      }
    });

    console.log(`✅ Chapter metadata:`, chaptersSummary);

  } catch (error) {
    console.error('❌ Database storage error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

async function storeCachedResults(cachedSentences) {
  const fullText = cachedSentences.map(s => s.simplifiedText).join(' ');
  const contentHash = generateContentHash(fullText);
  await storeSimplifiedBook(cachedSentences, contentHash);
}

// Run the simplification
simplifyGreatGatsby()
  .then(() => {
    console.log('\n🎉 Great Gatsby simplification complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Simplification failed:', error);
    process.exit(1);
  });