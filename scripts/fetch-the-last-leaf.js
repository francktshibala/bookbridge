import fs from 'fs';
import path from 'path';

const BOOK_ID = 'the-last-leaf';
const GUTENBERG_ID = '3707';
const GUTENBERG_URL = `https://www.gutenberg.org/files/${GUTENBERG_ID}/${GUTENBERG_ID}-0.txt`;

async function fetchTheLastLeaf() {
  console.log('📖 Fetching "The Last Leaf" by O. Henry...');
  console.log(`🔗 Source: Project Gutenberg ID ${GUTENBERG_ID} (The Trimmed Lamp collection)`);

  try {
    // Fetch the text from Project Gutenberg
    const response = await fetch(GUTENBERG_URL);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const fullText = await response.text();
    console.log(`📄 Downloaded ${fullText.length} characters`);

    // Extract "The Last Leaf" story from the collection
    const startMarker = 'THE LAST LEAF';
    const endMarker = 'A SERVICE OF LOVE'; // Next story in the collection

    const startIndex = fullText.indexOf(startMarker);
    let endIndex = fullText.indexOf(endMarker, startIndex + startMarker.length);

    if (startIndex === -1) {
      throw new Error('Story start marker "THE LAST LEAF" not found');
    }

    let extractedText;
    if (endIndex === -1) {
      console.log('⚠️ End marker not found, searching for alternative markers');
      // Try alternative end markers
      const altEndMarkers = ['WHILE THE AUTO WAITS', 'A LICKPENNY LOVER'];
      for (const marker of altEndMarkers) {
        endIndex = fullText.indexOf(marker, startIndex + startMarker.length);
        if (endIndex !== -1) break;
      }

      if (endIndex === -1) {
        console.log('⚠️ No end marker found, using content until reasonable break');
        // Find a natural break point (look for multiple line breaks indicating story end)
        const searchStart = startIndex + 2000; // Start looking after beginning of story
        const breakPattern = /\n\n\n+[A-Z]/; // Multiple line breaks followed by capital letter
        const breakMatch = fullText.substring(searchStart).match(breakPattern);
        if (breakMatch) {
          endIndex = searchStart + breakMatch.index;
        } else {
          // Fallback: take a reasonable chunk
          extractedText = fullText.substring(startIndex, startIndex + 5000);
        }
      }
    }

    if (!extractedText) {
      extractedText = fullText.substring(startIndex, endIndex);
    }

    // Clean up the text
    const cleanedText = extractedText
      .replace(/\r\n/g, '\n')  // Normalize line endings
      .replace(/\n{3,}/g, '\n\n')  // Remove excessive line breaks
      .replace(/\s+/g, ' ')      // Normalize whitespace
      .replace(/THE LAST LEAF\s*/i, '') // Remove title at beginning
      .trim();

    console.log(`✂️ Extracted story: ${cleanedText.length} characters`);

    // Save to cache directory
    const cacheDir = path.join(process.cwd(), 'cache');
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }

    const cacheFilePath = path.join(cacheDir, `${BOOK_ID}-original.txt`);
    fs.writeFileSync(cacheFilePath, cleanedText, 'utf8');

    console.log(`💾 Saved to: ${cacheFilePath}`);

    // Basic story statistics
    const sentences = cleanedText.split(/[.!?]+/).filter(s => s.trim().length > 10);
    const words = cleanedText.split(/\s+/).length;
    const paragraphs = cleanedText.split(/\n\n+/).length;

    console.log('📊 Story Statistics:');
    console.log(`   📝 Sentences: ${sentences.length}`);
    console.log(`   📖 Words: ${words}`);
    console.log(`   📄 Paragraphs: ${paragraphs}`);

    // Preview first few sentences
    console.log('\n📖 Story Preview:');
    sentences.slice(0, 3).forEach((sentence, i) => {
      console.log(`   ${i + 1}. ${sentence.trim()}.`);
    });

    return {
      text: cleanedText,
      filePath: cacheFilePath,
      stats: { sentences: sentences.length, words, paragraphs }
    };

  } catch (error) {
    console.error('❌ Failed to fetch The Last Leaf:', error.message);
    throw error;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  fetchTheLastLeaf()
    .then(() => console.log('\n✅ The Last Leaf fetched successfully!'))
    .catch(console.error);
}

export { fetchTheLastLeaf };