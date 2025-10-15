#!/usr/bin/env node

/**
 * Fetch Anne of Green Gables from Project Gutenberg
 * Classic coming-of-age story perfect for A2 level
 */

import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';

const BOOK_INFO = {
  id: 'anne-of-green-gables',
  title: 'Anne of Green Gables',
  author: 'L. M. Montgomery',
  gutenbergId: '45',
  gutenbergUrl: 'https://www.gutenberg.org/files/45/45-0.txt',
  startMarker: '*** START OF THE PROJECT GUTENBERG EBOOK',
  endMarker: '*** END OF THE PROJECT GUTENBERG EBOOK'
};

async function fetchAnneOfGreenGables() {
  console.log('📚 Fetching Anne of Green Gables from Project Gutenberg...');

  try {
    // Fetch the book content
    console.log(`🌐 Downloading from: ${BOOK_INFO.gutenbergUrl}`);
    const response = await fetch(BOOK_INFO.gutenbergUrl);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    let text = await response.text();
    console.log(`✅ Downloaded ${text.length} characters`);

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
      .replace(/^.*ANNE OF GREEN GABLES.*$/gm, '') // Remove duplicate titles
      .replace(/^.*L\. M\. MONTGOMERY.*$/gm, '')   // Remove author lines
      .replace(/^CHAPTER [IVXLC]+$/gm, 'CHAPTER')  // Normalize chapter markers
      .trim();

    // Split into sentences for counting
    const sentences = text.match(/[^.!?]*[.!?]/g) || [];
    console.log(`📊 Extracted ${sentences.length} sentences`);

    // Estimate word count
    const wordCount = text.split(/\s+/).length;
    console.log(`📊 Estimated ${wordCount} words`);

    // Show first few sentences to verify content
    const firstSentences = sentences.slice(0, 3);
    console.log('📝 First sentences preview:');
    firstSentences.forEach((sentence, i) => {
      console.log(`   ${i + 1}. ${sentence.trim()}`);
    });

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
      gutenbergId: BOOK_INFO.gutenbergId,
      fetchedAt: new Date().toISOString(),
      sentenceCount: sentences.length,
      wordCount: wordCount,
      status: 'raw'
    };

    const metadataPath = path.join(cacheDir, `${BOOK_INFO.id}-metadata.json`);
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
    console.log(`📋 Metadata saved to: ${metadataPath}`);

    console.log('✅ Anne of Green Gables fetched successfully!');
    console.log(`📈 Next step: node scripts/modernize-anne-of-green-gables.js`);

    return {
      text,
      metadata,
      sentences: sentences.length,
      words: wordCount
    };

  } catch (error) {
    console.error('❌ Error fetching Anne of Green Gables:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  fetchAnneOfGreenGables();
}

export { fetchAnneOfGreenGables };