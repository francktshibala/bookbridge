#!/usr/bin/env node

/**
 * Fetch The Little Prince from Project Gutenberg
 * Based on successful Gift of the Magi implementation
 */

import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';

const BOOK_INFO = {
  id: 'little-prince',
  title: 'The Little Prince',
  author: 'Antoine de Saint-Exupéry',
  gutenbergUrl: 'https://www.gutenberg.org/files/456/456-0.txt', // Plain text English translation
  startMarker: '*** START OF THE PROJECT GUTENBERG EBOOK',
  endMarker: '*** END OF THE PROJECT GUTENBERG EBOOK'
};

async function fetchLittlePrince() {
  console.log('📚 Fetching The Little Prince from Project Gutenberg...');

  try {
    // Fetch the book content
    console.log(`🌐 Downloading from: ${BOOK_INFO.gutenbergUrl}`);
    const response = await fetch(BOOK_INFO.gutenbergUrl);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const htmlContent = await response.text();
    console.log(`✅ Downloaded ${htmlContent.length} characters`);

    // Extract book content (remove HTML tags and Gutenberg headers/footers)
    let text = htmlContent;

    // Remove HTML tags
    text = text.replace(/<[^>]*>/g, '');

    // Extract content between Gutenberg markers
    const startIndex = text.indexOf(BOOK_INFO.startMarker);
    const endIndex = text.indexOf(BOOK_INFO.endMarker);

    if (startIndex === -1 || endIndex === -1) {
      console.log('⚠️ Gutenberg markers not found, using entire content');
    } else {
      text = text.substring(startIndex, endIndex);
      console.log('✅ Extracted content between Gutenberg markers');
    }

    // Clean up text
    text = text
      .replace(/\r\n/g, '\n')           // Normalize line endings
      .replace(/\n{3,}/g, '\n\n')       // Reduce multiple newlines
      .replace(/[ \t]+/g, ' ')          // Normalize spaces
      .trim();

    // Split into sentences for counting
    const sentences = text.match(/[^.!?]*[.!?]/g) || [];
    console.log(`📊 Extracted ${sentences.length} sentences`);

    // Estimate word count
    const wordCount = text.split(/\s+/).length;
    console.log(`📊 Estimated ${wordCount} words`);

    // Create cache directory
    const cacheDir = path.join(process.cwd(), 'cache');
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }

    // Save raw text
    const outputPath = path.join(cacheDir, `${BOOK_INFO.id}-raw.txt`);
    fs.writeFileSync(outputPath, text, 'utf-8');
    console.log(`💾 Saved to: ${outputPath}`);

    // Save metadata
    const metadata = {
      id: BOOK_INFO.id,
      title: BOOK_INFO.title,
      author: BOOK_INFO.author,
      source: BOOK_INFO.gutenbergUrl,
      fetchedAt: new Date().toISOString(),
      sentenceCount: sentences.length,
      wordCount: wordCount,
      status: 'raw'
    };

    const metadataPath = path.join(cacheDir, `${BOOK_INFO.id}-metadata.json`);
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
    console.log(`📋 Metadata saved to: ${metadataPath}`);

    console.log('✅ The Little Prince fetched successfully!');
    console.log(`📈 Next step: node scripts/modernize-little-prince.js`);

    return {
      text,
      metadata,
      sentences: sentences.length,
      words: wordCount
    };

  } catch (error) {
    console.error('❌ Error fetching The Little Prince:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  fetchLittlePrince();
}

export { fetchLittlePrince };