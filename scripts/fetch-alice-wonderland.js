#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

// Load environment variables
dotenv.config({ path: '.env.local' });

const prisma = new PrismaClient();

// Configuration
const PROJECT_ROOT = path.resolve(process.cwd());
const CACHE_DIR = path.join(PROJECT_ROOT, 'cache');
const OUTPUT_FILE = path.join(CACHE_DIR, 'alice-wonderland-original.json');

const BOOK_ID = 'gutenberg-11';
const GUTENBERG_URL = 'https://www.gutenberg.org/files/11/11-0.txt';

async function fetchAliceWonderland() {
  try {
    console.log('📚 Fetching Alice\'s Adventures in Wonderland from Project Gutenberg...\n');

    // Ensure cache directory exists
    if (!fs.existsSync(CACHE_DIR)) {
      fs.mkdirSync(CACHE_DIR, { recursive: true });
    }

    // Fetch the text
    console.log(`🌐 Downloading from: ${GUTENBERG_URL}`);
    const response = await fetch(GUTENBERG_URL);

    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.statusText}`);
    }

    const fullText = await response.text();
    console.log(`📄 Downloaded ${fullText.length} characters`);

    // Clean and extract the story content
    const cleaned = cleanAliceText(fullText);
    console.log(`🧹 Cleaned text: ${cleaned.split(/\s+/).length} words`);

    // Split into sentences for processing
    const sentences = cleaned
      .split(/(?<=[.!?])\s+/)
      .filter(s => s.trim().length > 0)
      .map(s => s.trim());

    console.log(`📝 Found ${sentences.length} sentences`);

    // Create book data structure
    const bookData = {
      bookId: BOOK_ID,
      title: 'Alice\'s Adventures in Wonderland',
      author: 'Lewis Carroll',
      era: 'Victorian',
      publishYear: 1865,
      genre: 'Children\'s Fantasy',
      originalSentences: sentences.length,
      fullText: cleaned,
      sentences: sentences,
      chapters: createChapterStructure(sentences),
      createdAt: new Date().toISOString()
    };

    // Save to cache
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(bookData, null, 2));
    console.log(`💾 Saved to cache: ${OUTPUT_FILE}`);

    // Save to database
    await saveToDatabase(bookData);

    console.log('\n🎉 Alice\'s Adventures in Wonderland fetch completed!');
    console.log(`📊 Summary: ${sentences.length} sentences, ${bookData.chapters.length} chapters`);

    return bookData;

  } catch (error) {
    console.error('❌ Error fetching Alice\'s Adventures in Wonderland:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

function cleanAliceText(rawText) {
  // Remove Project Gutenberg header and footer
  let text = rawText;

  // Find start of actual content (after title page)
  const startMarkers = [
    'CHAPTER I.',
    'CHAPTER I',
    'Down the Rabbit-Hole'
  ];

  let startIndex = -1;
  for (const marker of startMarkers) {
    const index = text.indexOf(marker);
    if (index !== -1) {
      startIndex = index;
      break;
    }
  }

  if (startIndex === -1) {
    console.warn('⚠️  Could not find story start, using full text');
    startIndex = 0;
  }

  // Find end of story (before "End of the Project Gutenberg")
  const endMarkers = [
    'End of the Project Gutenberg',
    'THE END',
    '*** END OF THE PROJECT GUTENBERG'
  ];

  let endIndex = text.length;
  for (const marker of endMarkers) {
    const index = text.indexOf(marker);
    if (index !== -1) {
      endIndex = index;
      break;
    }
  }

  // Extract story content
  text = text.slice(startIndex, endIndex).trim();

  // Clean up the text
  text = text
    // Remove excessive whitespace
    .replace(/\n\s*\n\s*\n/g, '\n\n')
    // Normalize spaces
    .replace(/[ \t]+/g, ' ')
    // Remove chapter headers that are on separate lines
    .replace(/\n\s*CHAPTER [IVX]+\.?\s*\n/g, '\n\n')
    // Clean up dialogue formatting
    .replace(/"\s+/g, '"')
    .replace(/\s+"/g, '"')
    // Remove page numbers and other artifacts
    .replace(/\n\s*\d+\s*\n/g, '\n')
    // Normalize punctuation
    .replace(/\s+([.!?,:;])/g, '$1')
    .replace(/([.!?])\s*\n/g, '$1 ')
    .trim();

  return text;
}

function createChapterStructure(sentences) {
  // Alice in Wonderland has 12 chapters
  const chapters = [
    { title: "Down the Rabbit-Hole", estimatedLength: 0.08 },
    { title: "The Pool of Tears", estimatedLength: 0.08 },
    { title: "A Caucus-Race and a Long Tale", estimatedLength: 0.08 },
    { title: "The Rabbit Sends in a Little Bill", estimatedLength: 0.08 },
    { title: "Advice from a Caterpillar", estimatedLength: 0.09 },
    { title: "Pig and Pepper", estimatedLength: 0.09 },
    { title: "A Mad Tea-Party", estimatedLength: 0.09 },
    { title: "The Queen's Croquet-Ground", estimatedLength: 0.08 },
    { title: "The Mock Turtle's Story", estimatedLength: 0.08 },
    { title: "The Lobster Quadrille", estimatedLength: 0.08 },
    { title: "Who Stole the Tarts?", estimatedLength: 0.08 },
    { title: "Alice's Evidence", estimatedLength: 0.09 }
  ];

  const totalSentences = sentences.length;
  let currentIndex = 0;

  return chapters.map((chapter, i) => {
    const startSentence = currentIndex;
    const chapterLength = Math.round(totalSentences * chapter.estimatedLength);
    let endSentence = Math.min(startSentence + chapterLength - 1, totalSentences - 1);

    // Ensure last chapter gets all remaining sentences
    if (i === chapters.length - 1) {
      endSentence = totalSentences - 1;
    }

    currentIndex = endSentence + 1;

    return {
      chapterNumber: i + 1,
      title: chapter.title,
      startSentence,
      endSentence,
      sentenceCount: endSentence - startSentence + 1
    };
  });
}

async function saveToDatabase(bookData) {
  console.log('\n💾 Saving to database...');

  try {
    // Create/update Book record
    await prisma.book.upsert({
      where: { id: bookData.bookId },
      update: {
        title: bookData.title,
        author: bookData.author
      },
      create: {
        id: bookData.bookId,
        title: bookData.title,
        author: bookData.author,
        publishYear: bookData.publishYear,
        genre: bookData.genre
      }
    });

    // Create/update BookContent record
    await prisma.bookContent.upsert({
      where: { bookId: bookData.bookId },
      update: {
        title: bookData.title,
        author: bookData.author,
        fullText: bookData.fullText,
        era: bookData.era,
        wordCount: bookData.fullText.split(/\s+/).length,
        totalChunks: bookData.sentences.length
      },
      create: {
        bookId: bookData.bookId,
        title: bookData.title,
        author: bookData.author,
        fullText: bookData.fullText,
        era: bookData.era,
        wordCount: bookData.fullText.split(/\s+/).length,
        totalChunks: bookData.sentences.length
      }
    });

    console.log('✅ Database records created/updated');

  } catch (error) {
    console.error('❌ Database save error:', error);
    throw error;
  }
}

// Execute if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  fetchAliceWonderland().catch(console.error);
}

export { fetchAliceWonderland };