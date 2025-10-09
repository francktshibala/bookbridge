#!/usr/bin/env node

/**
 * Fetch "The Necklace" by Guy de Maupassant from Project Gutenberg
 * Following Master Mistakes Prevention Phase 2, Step 3
 */

import { config } from 'dotenv';
import fs from 'fs';
import path from 'path';
import https from 'https';

// Load environment variables
config({ path: '.env.local' });

const BOOK_INFO = {
  id: 'the-necklace',
  title: 'The Necklace',
  author: 'Guy de Maupassant',
  gutenbergUrl: 'https://www.gutenberg.org/files/12758/12758-0.txt', // Library of the World's Best Mystery and Detective Stories
  startMarker: '_The Necklace_',
  endMarker: 'Monsieur Pierre Agénor De Vargnes'  // Start of next story
};

async function fetchTheNecklace() {
  console.log('💎 Fetching "The Necklace" by Guy de Maupassant from Project Gutenberg...');

  try {
    // Create cache directory
    const cacheDir = path.join(process.cwd(), 'cache');
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }

    // Fetch the full text
    const fullText = await fetchFromGutenberg(BOOK_INFO.gutenbergUrl);
    console.log(`📖 Downloaded ${fullText.length} characters from Project Gutenberg`);

    // Extract "The Necklace" story
    const extractedText = extractStory(fullText, BOOK_INFO.startMarker, BOOK_INFO.endMarker);

    if (!extractedText) {
      throw new Error('Could not extract "The Necklace" from the text');
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
    const outputPath = path.join(cacheDir, 'the-necklace-raw.txt');
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

    const metadataPath = path.join(cacheDir, 'the-necklace-metadata.json');
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
    console.log(`📋 Metadata saved to: ${metadataPath}`);

    console.log('✅ "The Necklace" fetch completed successfully!');
    console.log(`📈 Ready for Phase 2: Thematic section detection`);

    return {
      text: cleanText,
      metadata,
      sentences: sentences.length
    };

  } catch (error) {
    console.error('❌ Error fetching "The Necklace":', error.message);
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
  // Find the start of "The Necklace"
  const startIndex = fullText.indexOf(startMarker);
  if (startIndex === -1) {
    throw new Error(`Could not find start marker: ${startMarker}`);
  }

  // Find the next story start (end marker)
  const endIndex = fullText.indexOf(endMarker, startIndex + startMarker.length);
  if (endIndex === -1) {
    // If no end marker, take rest of text with reasonable cutoff
    return fullText.substring(startIndex);
  }

  return fullText.substring(startIndex, endIndex);
}

function cleanStoryText(text) {
  return text
    // Remove Project Gutenberg headers/footers
    .replace(/\*\*\* START OF.*?\*\*\*/gi, '')
    .replace(/\*\*\* END OF.*?\*\*\*/gi, '')
    // Remove extra whitespace
    .replace(/\n\s*\n\s*\n/g, '\n\n')
    .replace(/[ \t]+/g, ' ')
    // Clean up title formatting
    .replace(/THE NECKLACE\s*\n+/, 'THE NECKLACE\n\n')
    .trim();
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  fetchTheNecklace();
}

export { fetchTheNecklace };