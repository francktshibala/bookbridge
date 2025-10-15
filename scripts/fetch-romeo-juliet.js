#!/usr/bin/env node

import fs from 'fs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Configuration
const BOOK_ID = 'gutenberg-1513';
const GUTENBERG_URL = 'https://www.gutenberg.org/files/1513/1513-0.txt';
const CACHE_FILE = './cache/romeo-juliet-original.json';

async function fetchRomeoJuliet() {
  try {
    console.log('📚 Fetching Romeo and Juliet from Project Gutenberg...\n');

    // Check if already cached
    if (fs.existsSync(CACHE_FILE)) {
      console.log('📄 Found cached content, loading...');
      const cached = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'));
      console.log(`✅ Loaded ${cached.chunks.length} chunks from cache`);
      return cached;
    }

    // Fetch from Project Gutenberg
    console.log(`📡 Fetching from: ${GUTENBERG_URL}`);
    const response = await fetch(GUTENBERG_URL);

    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
    }

    let text = await response.text();
    console.log(`📄 Downloaded ${text.length} characters`);

    // Clean Project Gutenberg header/footer
    const startMarker = '*** START OF THE PROJECT GUTENBERG EBOOK';
    const endMarker = '*** END OF THE PROJECT GUTENBERG EBOOK';

    const startIndex = text.indexOf(startMarker);
    const endIndex = text.indexOf(endMarker);

    if (startIndex !== -1 && endIndex !== -1) {
      // Find the actual start after the header
      const headerEnd = text.indexOf('\n\n\n', startIndex);
      if (headerEnd !== -1) {
        text = text.substring(headerEnd + 3, endIndex).trim();
      }
    }

    // Remove extra whitespace and normalize
    text = text
      .replace(/\r\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    console.log(`🧹 Cleaned text: ${text.length} characters`);
    console.log(`📊 Word count: ${text.split(/\s+/).length} words`);

    // Create cache structure
    const cacheData = {
      bookId: BOOK_ID,
      title: 'Romeo and Juliet',
      author: 'William Shakespeare',
      fetchedAt: new Date().toISOString(),
      chunks: [{
        chunkIndex: 0,
        originalText: text,
        wordCount: text.split(/\s+/).length
      }],
      totalWords: text.split(/\s+/).length
    };

    // Save to cache
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cacheData, null, 2));
    console.log(`💾 Cached to: ${CACHE_FILE}`);

    // Save to database
    await saveToDatabase(cacheData);

    console.log('\n🎉 Romeo and Juliet fetch completed successfully!');
    return cacheData;

  } catch (error) {
    console.error('❌ Error fetching Romeo and Juliet:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

async function saveToDatabase(data) {
  console.log('\n💾 Saving to database...');

  try {
    // Create book record
    await prisma.book.upsert({
      where: { id: data.bookId },
      update: {
        title: data.title,
        author: data.author
      },
      create: {
        id: data.bookId,
        title: data.title,
        author: data.author,
        publishYear: 1597,
        genre: 'Tragedy',
        language: 'en',
        publicDomain: true
      }
    });

    // Create book content
    await prisma.bookContent.upsert({
      where: { bookId: data.bookId },
      update: {
        title: data.title,
        author: data.author,
        fullText: data.chunks[0].originalText,
        wordCount: data.totalWords,
        totalChunks: 1
      },
      create: {
        bookId: data.bookId,
        title: data.title,
        author: data.author,
        fullText: data.chunks[0].originalText,
        wordCount: data.totalWords,
        totalChunks: 1
      }
    });

    console.log('✅ Saved to database');

  } catch (error) {
    console.error('❌ Database save error:', error);
    throw error;
  }
}

// Execute if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  fetchRomeoJuliet().catch(console.error);
}

export { fetchRomeoJuliet };