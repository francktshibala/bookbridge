import fs from 'fs';
import path from 'path';

const GUTENBERG_URL = 'https://www.gutenberg.org/files/46/46-0.txt';
const OUTPUT_FILE = 'data/christmas-carol/original.txt';

async function fetchChristmasCarol() {
  console.log('🎄 Fetching "A Christmas Carol" from Project Gutenberg...');
  console.log(`🔗 URL: ${GUTENBERG_URL}`);

  try {
    // Fetch the text file
    const response = await fetch(GUTENBERG_URL);
    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
    }

    const fullText = await response.text();
    console.log(`📄 Downloaded ${fullText.length} characters`);

    // Extract the main story text
    const startMarker = 'A CHRISTMAS CAROL';
    const endMarkers = [
      '*** END OF THE PROJECT GUTENBERG',
      'End of the Project Gutenberg',
      'THE END'
    ];

    let startIndex = fullText.indexOf(startMarker);
    if (startIndex === -1) {
      // Try alternative marker
      startIndex = fullText.indexOf('Christmas Carol');
    }

    let endIndex = -1;
    for (const marker of endMarkers) {
      endIndex = fullText.indexOf(marker, startIndex);
      if (endIndex !== -1) break;
    }

    if (startIndex === -1) {
      throw new Error('Could not find "A Christmas Carol" in the text');
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
      .replace(/\r\n/g, '\n')           // Normalize line endings
      .replace(/\n{3,}/g, '\n\n')       // Reduce excessive line breaks
      .replace(/\s+$/gm, '')            // Trim trailing whitespace
      .replace(/^\s+/gm, '')            // Trim leading whitespace
      .trim();

    // Split into chapters for better structure
    const chapters = detectChapters(storyText);

    console.log(`📖 Detected ${chapters.length} chapters`);
    chapters.forEach((chapter, i) => {
      console.log(`   Chapter ${i + 1}: ${chapter.title}`);
    });

    // Count sentences for cost estimation
    const sentences = storyText.split(/[.!?]+/).filter(s => s.trim().length > 10);
    console.log(`📝 Estimated ${sentences.length} sentences`);
    console.log(`💰 Estimated cost: ~$${(sentences.length * 0.01).toFixed(2)} for audio generation`);

    // Create output directory
    const outputDir = path.dirname(OUTPUT_FILE);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Save the clean text
    fs.writeFileSync(OUTPUT_FILE, storyText);
    console.log(`✅ Saved to: ${OUTPUT_FILE}`);
    console.log(`📊 Final text: ${storyText.length} characters`);

    // Save metadata
    const metadata = {
      title: 'A Christmas Carol',
      author: 'Charles Dickens',
      gutenbergId: 46,
      originalUrl: GUTENBERG_URL,
      fetchDate: new Date().toISOString(),
      chapters: chapters,
      estimatedSentences: sentences.length,
      textLength: storyText.length
    };

    const metadataFile = 'data/christmas-carol/metadata.json';
    fs.writeFileSync(metadataFile, JSON.stringify(metadata, null, 2));
    console.log(`📋 Metadata saved to: ${metadataFile}`);

  } catch (error) {
    console.error('❌ Error fetching A Christmas Carol:', error.message);
    process.exit(1);
  }
}

function detectChapters(text) {
  // A Christmas Carol has 5 staves (chapters)
  const staveMarkers = [
    'STAVE I',
    'STAVE II',
    'STAVE III',
    'STAVE IV',
    'STAVE V'
  ];

  const chapters = [];

  for (let i = 0; i < staveMarkers.length; i++) {
    const marker = staveMarkers[i];
    const startIndex = text.indexOf(marker);

    if (startIndex !== -1) {
      // Look for the subtitle after the stave marker
      const lineEnd = text.indexOf('\n', startIndex);
      const nextLineEnd = text.indexOf('\n', lineEnd + 1);
      const subtitle = text.substring(lineEnd + 1, nextLineEnd).trim();

      chapters.push({
        number: i + 1,
        title: `${marker}: ${subtitle}`,
        startIndex: startIndex
      });
    }
  }

  // If no staves found, create simple chapters
  if (chapters.length === 0) {
    chapters.push({
      number: 1,
      title: 'A Christmas Carol',
      startIndex: 0
    });
  }

  return chapters;
}

// Run the script
fetchChristmasCarol();