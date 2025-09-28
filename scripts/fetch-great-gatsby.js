#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

const GUTENBERG_URL = 'https://www.gutenberg.org/files/64317/64317-0.txt';
const OUTPUT_FILE = 'data/great-gatsby/original.txt';

async function fetchGreatGatsby() {
  console.log('📚 Fetching "The Great Gatsby" from Project Gutenberg...');
  console.log(`🔗 URL: ${GUTENBERG_URL}`);

  try {
    // Fetch the text file
    const response = await fetch(GUTENBERG_URL);
    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
    }

    const fullText = await response.text();
    console.log(`📄 Downloaded ${fullText.length} characters`);

    // Extract just "The Great Gatsby" from the full Gutenberg file
    const startMarker = 'THE GREAT GATSBY';
    const endMarkers = [
      '*** END OF THE PROJECT GUTENBERG',
      'End of the Project Gutenberg',
      'THE END',
      '***END OF THE PROJECT GUTENBERG***'
    ];

    let startIndex = fullText.indexOf(startMarker);
    if (startIndex === -1) {
      // Try alternative markers
      const altStartMarkers = ['The Great Gatsby', 'GREAT GATSBY'];
      for (const marker of altStartMarkers) {
        startIndex = fullText.indexOf(marker);
        if (startIndex !== -1) break;
      }
    }

    if (startIndex === -1) {
      throw new Error('Could not find "The Great Gatsby" in the text');
    }

    // Find end marker
    let endIndex = -1;
    for (const marker of endMarkers) {
      endIndex = fullText.indexOf(marker, startIndex);
      if (endIndex !== -1) break;
    }

    // Extract the story text
    let storyText;
    if (endIndex !== -1) {
      storyText = fullText.substring(startIndex, endIndex);
    } else {
      // Take from start to end if no end marker found
      storyText = fullText.substring(startIndex);
    }

    // Clean up the text
    storyText = storyText
      .replace(/\r\n/g, '\n') // Normalize line endings
      .replace(/\n{3,}/g, '\n\n') // Reduce excessive line breaks
      .replace(/^\s+|\s+$/g, '') // Trim whitespace
      .replace(/_{10,}/g, '') // Remove underline decorations
      .replace(/\*{3,}/g, '') // Remove asterisk decorations
      .replace(/={10,}/g, ''); // Remove equal sign decorations

    // 🎯 ENHANCED: Detect chapter structure
    const chapters = detectChapters(storyText);

    // Ensure output directory exists
    const outputDir = path.dirname(OUTPUT_FILE);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Write to file
    fs.writeFileSync(OUTPUT_FILE, storyText, 'utf8');

    // Get basic stats
    const sentences = storyText.split(/[.!?]+\s+/).filter(s => s.trim().length > 20);
    const words = storyText.split(/\s+/).length;
    const paragraphs = storyText.split(/\n\s*\n/).filter(p => p.trim().length > 0).length;

    console.log('✅ Successfully fetched and processed "The Great Gatsby"');
    console.log(`📊 Statistics:`);
    console.log(`   - File saved: ${OUTPUT_FILE}`);
    console.log(`   - Characters: ${storyText.length.toLocaleString()}`);
    console.log(`   - Words: ${words.toLocaleString()}`);
    console.log(`   - Estimated sentences: ${sentences.length}`);
    console.log(`   - Paragraphs: ${paragraphs}`);
    console.log(`   - Chapters detected: ${chapters.length}`);
    console.log(`   - Estimated pages: ${Math.round(words / 250)}`);

    // Enhanced metadata with chapter structure
    const metadata = {
      title: 'The Great Gatsby',
      author: 'F. Scott Fitzgerald',
      source: 'Project Gutenberg',
      url: GUTENBERG_URL,
      fetchedAt: new Date().toISOString(),
      stats: {
        characters: storyText.length,
        words: words,
        estimatedSentences: sentences.length,
        paragraphs: paragraphs,
        estimatedPages: Math.round(words / 250),
        chapters: chapters.length
      },
      processing: {
        startMarker: startMarker,
        endMarker: endIndex !== -1 ? 'Found end marker' : 'EOF',
        cleaned: true,
        chaptersDetected: true
      },
      chapters: chapters
    };

    fs.writeFileSync(
      'data/great-gatsby/metadata.json',
      JSON.stringify(metadata, null, 2),
      'utf8'
    );

    // Save chapter structure separately for easy access
    fs.writeFileSync(
      'data/great-gatsby/chapters.json',
      JSON.stringify(chapters, null, 2),
      'utf8'
    );

    console.log(`📋 Metadata saved to: data/great-gatsby/metadata.json`);
    console.log(`📚 Chapter structure saved to: data/great-gatsby/chapters.json`);
    console.log('');
    console.log('📖 Chapter Structure:');
    chapters.forEach(chapter => {
      console.log(`   ${chapter.number}. ${chapter.title} (${chapter.estimatedSentences} sentences)`);
    });
    console.log('');
    console.log('🚀 Next steps:');
    console.log('1. Review the extracted text and chapter structure');
    console.log('2. Create modernization script: node scripts/modernize-great-gatsby.js');

  } catch (error) {
    console.error('❌ Error fetching Great Gatsby:', error.message);
    process.exit(1);
  }
}

/**
 * Detect chapter structure in The Great Gatsby
 * The novel has 9 chapters, typically marked by Roman numerals or clear breaks
 */
function detectChapters(text) {
  console.log('🔍 Detecting chapter structure...');

  // The Great Gatsby has 9 chapters - look for chapter breaks in main content
  // Skip table of contents by looking for chapters after "Thomas Parke d'Invilliers"
  const contentStart = text.indexOf("Thomas Parke d'Invilliers");
  const mainContent = contentStart !== -1 ? text.substring(contentStart) : text;

  // Look for Roman numerals that are standalone chapter markers (surrounded by newlines)
  const chapterPattern = /\n\s*([IVX]+)\s*\n\s*\n/g;
  const chapters = [];
  let chapterPositions = [];
  let match;

  // Find all chapter markers in main content
  while ((match = chapterPattern.exec(mainContent)) !== null) {
    const romanNumeral = match[1];
    const number = romanToNumber(romanNumeral);

    if (number && number <= 9) {
      chapterPositions.push({
        number: number,
        position: contentStart + match.index + match[0].indexOf(romanNumeral),
        marker: romanNumeral,
        actualPosition: contentStart + match.index
      });
    }
  }

  // If we found fewer than expected chapters, try alternative detection
  if (chapterPositions.length < 7) {
    console.log('⚠️  Standard markers found fewer chapters, using alternative detection...');
    chapterPositions = detectChaptersByContent(text);
  }

  // Create chapter metadata with thematic titles
  const chapterTitles = [
    "Nick Arrives in West Egg",
    "The Valley of Ashes",
    "Gatsby's Party",
    "The Truth About Gatsby",
    "The Reunion",
    "The Past Revealed",
    "The Confrontation",
    "The Tragedy",
    "The End of the Dream"
  ];

  // Sort by chapter number to ensure proper order
  chapterPositions.sort((a, b) => a.number - b.number);

  // Build chapter structure using detected positions
  for (let i = 0; i < chapterPositions.length; i++) {
    const currentChapter = chapterPositions[i];
    const nextChapter = chapterPositions[i + 1];

    const startPos = currentChapter.actualPosition;
    const endPos = nextChapter ? nextChapter.actualPosition : text.length;
    const chapterText = text.substring(startPos, endPos);

    const sentences = chapterText.split(/[.!?]+\s+/).filter(s => s.trim().length > 20);
    const words = chapterText.split(/\s+/).length;

    chapters.push({
      number: currentChapter.number,
      title: chapterTitles[currentChapter.number - 1] || `Chapter ${currentChapter.number}`,
      startPosition: startPos,
      endPosition: endPos,
      estimatedSentences: sentences.length,
      words: words,
      theme: getChapterTheme(currentChapter.number),
      marker: currentChapter.marker
    });
  }

  // Fallback if no chapters detected - create 9 equal sections
  if (chapters.length === 0) {
    console.log('📝 No chapters detected, creating 9 equal sections...');
    const textLength = text.length;
    const chapterLength = Math.floor(textLength / 9);

    for (let i = 0; i < 9; i++) {
      const startPos = i * chapterLength;
      const endPos = (i === 8) ? textLength : (i + 1) * chapterLength;
      const chapterText = text.substring(startPos, endPos);
      const sentences = chapterText.split(/[.!?]+\s+/).filter(s => s.trim().length > 20);

      chapters.push({
        number: i + 1,
        title: chapterTitles[i],
        startPosition: startPos,
        endPosition: endPos,
        estimatedSentences: sentences.length,
        words: chapterText.split(/\s+/).length,
        theme: getChapterTheme(i + 1),
        method: 'equal_division'
      });
    }
  }

  return chapters;
}

/**
 * Alternative chapter detection by content analysis
 */
function detectChaptersByContent(text) {
  // Look for significant paragraph breaks that might indicate chapters
  const paragraphs = text.split(/\n\s*\n/);
  const significantBreaks = [];

  // Find paragraphs that might start chapters (looking for narrative shifts)
  for (let i = 0; i < paragraphs.length; i++) {
    const para = paragraphs[i].trim();
    if (para.length > 50) {
      // Look for chapter-starting patterns
      if (
        para.match(/^(In|When|The|That|Most|And so|As I)/i) &&
        para.length < 200 && // Short opening paragraphs
        i > 0 // Not the very first paragraph
      ) {
        significantBreaks.push({
          number: significantBreaks.length + 1,
          position: text.indexOf(para),
          marker: `Content break ${significantBreaks.length + 1}`
        });
      }
    }
  }

  return significantBreaks.slice(0, 9); // Limit to 9 chapters
}

/**
 * Get thematic description for each chapter
 */
function getChapterTheme(chapterNumber) {
  const themes = {
    1: "Introduction to the narrator Nick and the wealthy East Egg society",
    2: "The moral wasteland and Tom's affair with Myrtle Wilson",
    3: "Gatsby's lavish parties and Nick's growing fascination",
    4: "Gatsby's mysterious background and connection to Meyer Wolfsheim",
    5: "The arranged reunion between Gatsby and Daisy",
    6: "Gatsby's true origins and his transformation from James Gatz",
    7: "The hotel confrontation and the unraveling of relationships",
    8: "Myrtle's death and the aftermath of the tragedy",
    9: "Gatsby's death and Nick's reflections on the American Dream"
  };

  return themes[chapterNumber] || "Chapter theme";
}

/**
 * Convert Roman numeral to number
 */
function romanToNumber(roman) {
  const romanNumerals = {
    'I': 1, 'II': 2, 'III': 3, 'IV': 4, 'V': 5,
    'VI': 6, 'VII': 7, 'VIII': 8, 'IX': 9
  };
  return romanNumerals[roman] || null;
}

fetchGreatGatsby();