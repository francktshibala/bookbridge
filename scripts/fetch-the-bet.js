#!/usr/bin/env node

/**
 * Fetch "The Bet" by Anton Chekhov from Project Gutenberg
 * Following Master Mistakes Prevention Phase 2, Step 4
 */

import { config } from 'dotenv';
import fs from 'fs';
import path from 'path';
import https from 'https';

// Load environment variables
config({ path: '.env.local' });

const BOOK_INFO = {
  id: 'the-bet',
  title: 'The Bet',
  author: 'Anton Chekhov',
  gutenbergUrl: 'https://www.gutenberg.org/files/1732/1732-0.txt', // Chekhov collection
  startMarker: 'THE BET',
  endMarker: "the fireproof safe."
};

async function fetchTheBet() {
  console.log('🎰 Fetching "The Bet" by Anton Chekhov from Project Gutenberg...');

  try {
    // Create cache directory
    const cacheDir = path.join(process.cwd(), 'cache');
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }

    // Fetch the full Chekhov collection
    const fullText = await fetchFromGutenberg(BOOK_INFO.gutenbergUrl);
    console.log(`📖 Downloaded ${fullText.length} characters from Project Gutenberg`);

    // Extract "The Bet" story from the collection
    const extractedText = extractStory(fullText, BOOK_INFO.startMarker, BOOK_INFO.endMarker);

    if (!extractedText) {
      throw new Error('Could not extract "The Bet" from the collection');
    }

    console.log(`✂️ Extracted story: ${extractedText.length} characters`);

    // Clean and format the text
    const cleanText = cleanStoryText(extractedText);

    // Count sentences
    const sentences = cleanText.match(/[^.!?]*[.!?]/g) || [];
    console.log(`📊 Story statistics:`);
    console.log(`   - Characters: ${cleanText.length}`);
    console.log(`   - Words: ${cleanText.split(/\s+/).length}`);
    console.log(`   - Sentences: ${sentences.length}`);

    // Save to cache
    const outputPath = path.join(cacheDir, 'the-bet-raw.txt');
    fs.writeFileSync(outputPath, cleanText, 'utf-8');
    console.log(`💾 Saved to: ${outputPath}`);

    // Save metadata
    const metadata = {
      id: BOOK_INFO.id,
      title: BOOK_INFO.title,
      author: BOOK_INFO.author,
      source: BOOK_INFO.gutenbergUrl,
      extractedAt: new Date().toISOString(),
      characters: cleanText.length,
      words: cleanText.split(/\s+/).length,
      sentences: sentences.length,
      estimatedReadingTime: `${Math.ceil(cleanText.split(/\s+/).length / 200)} minutes` // 200 WPM average
    };

    const metadataPath = path.join(cacheDir, 'the-bet-metadata.json');
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
    console.log(`📋 Metadata saved to: ${metadataPath}`);

    console.log('✅ "The Bet" fetch completed successfully!');
    console.log(`📈 Ready for Phase 2: Text simplification`);

    return {
      text: cleanText,
      metadata,
      sentences: sentences.length
    };

  } catch (error) {
    console.error('❌ Error fetching "The Bet":', error.message);
    process.exit(1);
  }
}

async function fetchFromGutenberg(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        resolve(data);
      });

    }).on('error', (error) => {
      reject(new Error(`Failed to fetch from Project Gutenberg: ${error.message}`));
    });
  });
}

function extractStory(fullText, startMarker, endMarker) {
  // Find the start of "The Bet" story
  const startIndex = fullText.indexOf(startMarker);
  if (startIndex === -1) {
    throw new Error(`Could not find start marker: ${startMarker}`);
  }

  // Find the next story start (end marker)
  const endIndex = fullText.indexOf(endMarker, startIndex + startMarker.length);
  if (endIndex === -1) {
    throw new Error(`Could not find end marker: ${endMarker}`);
  }

  return fullText.substring(startIndex, endIndex);
}

function cleanStoryText(text) {
  return text
    // Remove the title header
    .replace(/^THE BET\s*\n+/, '')
    // Remove extra whitespace
    .replace(/\n\s*\n\s*\n/g, '\n\n')
    .replace(/[ \t]+/g, ' ')
    // Clean up paragraph breaks
    .replace(/\n{2,}/g, '\n\n')
    .trim();
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  fetchTheBet();
}

export { fetchTheBet };