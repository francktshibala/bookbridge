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
const OUTPUT_FILE = path.join(CACHE_DIR, 'jekyll-hyde-original.json');

const BOOK_ID = 'gutenberg-43';
const GUTENBERG_URL = 'https://www.gutenberg.org/files/43/43-0.txt';

async function fetchJekyllHyde() {
  try {
    console.log('📚 Fetching The Strange Case of Dr. Jekyll and Mr. Hyde from Project Gutenberg...\n');

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
    const cleaned = cleanJekyllHydeText(fullText);
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
      title: 'The Strange Case of Dr. Jekyll and Mr. Hyde',
      author: 'Robert Louis Stevenson',
      era: 'Victorian',
      publishYear: 1886,
      genre: 'Gothic Horror',
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

    console.log('\n🎉 Jekyll & Hyde fetch completed!');
    console.log(`📊 Summary: ${sentences.length} sentences, ${bookData.chapters.length} chapters`);

    return bookData;

  } catch (error) {
    console.error('❌ Error fetching Jekyll & Hyde:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

function cleanJekyllHydeText(rawText) {
  // Remove Project Gutenberg header and footer
  let text = rawText;

  // Find start of actual content
  const startMarkers = [
    'STORY OF THE DOOR',
    'Mr. Utterson the lawyer'
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

  // Find end of story
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
    .replace(/\n\s*[IVX]+\.\s*\n/g, '\n\n')
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
  // Jekyll & Hyde has 10 chapters
  const chapters = [
    { title: "Story of the Door", estimatedLength: 0.10 },
    { title: "Search for Mr. Hyde", estimatedLength: 0.10 },
    { title: "Dr. Jekyll Was Quite at Ease", estimatedLength: 0.08 },
    { title: "The Carew Murder Case", estimatedLength: 0.10 },
    { title: "Incident of the Letter", estimatedLength: 0.10 },
    { title: "Remarkable Incident of Dr. Lanyon", estimatedLength: 0.10 },
    { title: "Incident at the Window", estimatedLength: 0.08 },
    { title: "The Last Night", estimatedLength: 0.14 },
    { title: "Dr. Lanyon's Narrative", estimatedLength: 0.10 },
    { title: "Henry Jekyll's Full Statement", estimatedLength: 0.10 }
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
  fetchJekyllHyde().catch(console.error);
}

export { fetchJekyllHyde };