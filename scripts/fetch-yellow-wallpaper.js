#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Yellow Wallpaper Configuration
const BOOK_ID = 'gutenberg-1952';
const GUTENBERG_URL = 'https://www.gutenberg.org/files/1952/1952-0.txt';
const PROJECT_ROOT = path.resolve(process.cwd());
const CACHE_DIR = path.join(PROJECT_ROOT, 'cache');
const CACHE_FILE = path.join(CACHE_DIR, 'yellow-wallpaper-original.json');

async function fetchYellowWallpaper() {
  try {
    console.log('📚 Fetching The Yellow Wallpaper from Project Gutenberg...\n');

    // Ensure cache directory exists
    if (!fs.existsSync(CACHE_DIR)) {
      fs.mkdirSync(CACHE_DIR, { recursive: true });
    }

    // Check if we already have cached content
    if (fs.existsSync(CACHE_FILE)) {
      console.log('📄 Found cached content, loading...');
      const cached = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'));
      console.log(`✅ Loaded ${cached.chunks.length} chunks from cache`);
      return cached;
    }

    // Fetch from Project Gutenberg
    console.log('🌐 Downloading from Project Gutenberg...');
    const response = await fetch(GUTENBERG_URL);
    const rawText = await response.text();

    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
    }

    console.log(`📥 Downloaded ${rawText.length} characters`);

    // Clean and extract the story
    const cleanedText = cleanYellowWallpaperText(rawText);

    // Split into chunks for processing
    const chunks = createChunks(cleanedText);

    // Create book metadata
    const bookData = {
      bookId: BOOK_ID,
      title: 'The Yellow Wallpaper',
      author: 'Charlotte Perkins Gilman',
      publicationYear: 1892,
      genre: 'Short Story',
      description: 'A classic short story about a woman\'s descent into madness, written as a critique of medical and social treatment of women in the late 19th century.',
      totalChunks: chunks.length,
      chunks: chunks,
      fetchedAt: new Date().toISOString()
    };

    // Save to cache
    fs.writeFileSync(CACHE_FILE, JSON.stringify(bookData, null, 2));
    console.log(`💾 Cached ${chunks.length} chunks to ${CACHE_FILE}`);

    // Save to database
    await saveToDatabase(bookData);

    console.log('\n🎉 Yellow Wallpaper fetch completed successfully!');
    return bookData;

  } catch (error) {
    console.error('❌ Error fetching Yellow Wallpaper:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

function cleanYellowWallpaperText(rawText) {
  console.log('🧹 Cleaning Project Gutenberg text...');

  // Remove Project Gutenberg header/footer
  let text = rawText;

  // Find start of actual story
  const startMarkers = [
    'THE YELLOW WALLPAPER',
    'It is very seldom that mere ordinary people',
    'THE YELLOW WALL-PAPER' // Alternative title format
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
    console.warn('⚠️ Could not find story start, using full text');
  } else {
    text = text.substring(startIndex);
    console.log('✂️ Removed Project Gutenberg header');
  }

  // Find end of story (before Project Gutenberg footer)
  const endMarkers = [
    'End of the Project Gutenberg',
    '*** END OF THE PROJECT GUTENBERG',
    'END OF THE PROJECT GUTENBERG'
  ];

  for (const marker of endMarkers) {
    const index = text.indexOf(marker);
    if (index !== -1) {
      text = text.substring(0, index);
      console.log('✂️ Removed Project Gutenberg footer');
      break;
    }
  }

  // Clean up the text
  text = text
    .replace(/THE YELLOW WALLPAPER\s*/i, '') // Remove title if at start
    .replace(/THE YELLOW WALL-PAPER\s*/i, '') // Alternative title
    .replace(/\r\n/g, '\n') // Normalize line endings
    .replace(/\n{3,}/g, '\n\n') // Limit consecutive newlines
    .replace(/\s+\n/g, '\n') // Remove trailing spaces
    .trim();

  console.log(`📝 Cleaned text: ${text.length} characters`);
  return text;
}

function createChunks(text) {
  console.log('📦 Creating chunks...');

  // The Yellow Wallpaper is a short story, so we'll create smaller chunks
  const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);

  const chunks = [];
  const wordsPerChunk = 150; // Smaller chunks for A1 level

  let currentChunk = '';
  let currentWordCount = 0;
  let chunkIndex = 0;

  for (const paragraph of paragraphs) {
    const paragraphWords = paragraph.trim().split(/\s+/).length;

    if (currentWordCount + paragraphWords > wordsPerChunk && currentChunk.trim()) {
      // Save current chunk
      chunks.push({
        chunkIndex: chunkIndex++,
        text: currentChunk.trim(),
        wordCount: currentWordCount,
        paragraphCount: currentChunk.split(/\n\s*\n/).length
      });

      // Start new chunk
      currentChunk = paragraph + '\n\n';
      currentWordCount = paragraphWords;
    } else {
      // Add to current chunk
      currentChunk += paragraph + '\n\n';
      currentWordCount += paragraphWords;
    }
  }

  // Add final chunk if it has content
  if (currentChunk.trim()) {
    chunks.push({
      chunkIndex: chunkIndex++,
      text: currentChunk.trim(),
      wordCount: currentWordCount,
      paragraphCount: currentChunk.split(/\n\s*\n/).length
    });
  }

  console.log(`📦 Created ${chunks.length} chunks (avg ${Math.round(chunks.reduce((sum, c) => sum + c.wordCount, 0) / chunks.length)} words per chunk)`);
  return chunks;
}

async function saveToDatabase(bookData) {
  console.log('💾 Saving to database...');

  try {
    // Create book record
    await prisma.book.upsert({
      where: { id: bookData.bookId },
      update: {
        title: bookData.title,
        author: bookData.author,
        publishYear: bookData.publicationYear,
        genre: bookData.genre,
        description: bookData.description
      },
      create: {
        id: bookData.bookId,
        title: bookData.title,
        author: bookData.author,
        publishYear: bookData.publicationYear,
        genre: bookData.genre,
        description: bookData.description
      }
    });

    // Create book content
    await prisma.bookContent.upsert({
      where: { bookId: bookData.bookId },
      update: {
        title: bookData.title,
        author: bookData.author,
        fullText: bookData.chunks.map(c => c.text).join('\n\n'),
        totalChunks: bookData.totalChunks
      },
      create: {
        bookId: bookData.bookId,
        title: bookData.title,
        author: bookData.author,
        fullText: bookData.chunks.map(c => c.text).join('\n\n'),
        totalChunks: bookData.totalChunks
      }
    });

    console.log('✅ Saved book and content to database');

  } catch (error) {
    console.error('❌ Error saving to database:', error);
    throw error;
  }
}

// Execute if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  fetchYellowWallpaper().catch(console.error);
}

export { fetchYellowWallpaper };