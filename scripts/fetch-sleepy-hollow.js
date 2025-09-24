import fs from 'fs';
import path from 'path';

const GUTENBERG_URL = 'https://www.gutenberg.org/files/41/41-0.txt';
const OUTPUT_FILE = 'data/sleepy-hollow/original.txt';

async function fetchSleepyHollow() {
  console.log('📚 Fetching "The Legend of Sleepy Hollow" from Project Gutenberg...');
  console.log(`🔗 URL: ${GUTENBERG_URL}`);

  try {
    // Fetch the text file
    const response = await fetch(GUTENBERG_URL);
    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
    }

    const fullText = await response.text();
    console.log(`📄 Downloaded ${fullText.length} characters`);

    // Extract just "The Legend of Sleepy Hollow" from the collection
    const startMarker = 'THE LEGEND OF SLEEPY HOLLOW';
    const endMarker = 'RIP VAN WINKLE'; // Next story in collection

    let startIndex = fullText.indexOf(startMarker);
    if (startIndex === -1) {
      // Try alternative marker
      startMarker = 'Legend of Sleepy Hollow';
      startIndex = fullText.indexOf(startMarker);
    }

    let endIndex = fullText.indexOf(endMarker, startIndex);
    if (endIndex === -1) {
      // If no next story found, look for end markers
      const altEndMarkers = [
        '*** END OF THE PROJECT GUTENBERG',
        'End of the Project Gutenberg',
        'THE END'
      ];
      for (const marker of altEndMarkers) {
        endIndex = fullText.indexOf(marker, startIndex);
        if (endIndex !== -1) break;
      }
    }

    if (startIndex === -1) {
      throw new Error('Could not find "The Legend of Sleepy Hollow" in the text');
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

    console.log('✅ Successfully fetched and processed "The Legend of Sleepy Hollow"');
    console.log(`📊 Statistics:`);
    console.log(`   - File saved: ${OUTPUT_FILE}`);
    console.log(`   - Characters: ${storyText.length.toLocaleString()}`);
    console.log(`   - Words: ${words.toLocaleString()}`);
    console.log(`   - Estimated sentences: ${sentences.length}`);
    console.log(`   - Paragraphs: ${paragraphs}`);
    console.log(`   - Estimated pages: ${Math.round(words / 250)}`);

    // Store metadata
    const metadata = {
      title: 'The Legend of Sleepy Hollow',
      author: 'Washington Irving',
      source: 'Project Gutenberg',
      url: GUTENBERG_URL,
      fetchedAt: new Date().toISOString(),
      stats: {
        characters: storyText.length,
        words: words,
        estimatedSentences: sentences.length,
        paragraphs: paragraphs,
        estimatedPages: Math.round(words / 250)
      },
      processing: {
        startMarker: startMarker,
        endMarker: endIndex !== -1 ? endMarker : 'EOF',
        cleaned: true
      }
    };

    fs.writeFileSync(
      'data/sleepy-hollow/metadata.json',
      JSON.stringify(metadata, null, 2),
      'utf8'
    );

    console.log(`📋 Metadata saved to: data/sleepy-hollow/metadata.json`);
    console.log('');
    console.log('🚀 Next steps:');
    console.log('1. Review the extracted text for quality');
    console.log('2. Create modernization script: node scripts/modernize-sleepy-hollow.js');

  } catch (error) {
    console.error('❌ Error fetching Sleepy Hollow:', error.message);
    process.exit(1);
  }
}

fetchSleepyHollow();