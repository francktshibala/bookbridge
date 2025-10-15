import fs from 'fs';
import path from 'path';

const BOOK_ID = 'gift-of-the-magi';
const GUTENBERG_ID = '7256';
const GUTENBERG_URL = `https://www.gutenberg.org/files/${GUTENBERG_ID}/${GUTENBERG_ID}-0.txt`;

async function fetchGiftOfTheMagi() {
  console.log('📖 Fetching "The Gift of the Magi" by O. Henry...');
  console.log(`🔗 Source: Project Gutenberg ID ${GUTENBERG_ID}`);

  try {
    // Fetch the text from Project Gutenberg
    const response = await fetch(GUTENBERG_URL);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const fullText = await response.text();
    console.log(`📄 Downloaded ${fullText.length} characters`);

    // Extract the story content (between specific markers)
    const startMarker = 'One dollar and eighty-seven cents.';
    const endMarker = 'THE END';

    const startIndex = fullText.indexOf(startMarker);
    const endIndex = fullText.indexOf(endMarker);

    if (startIndex === -1) {
      throw new Error('Story start marker not found');
    }

    let extractedText;
    if (endIndex === -1) {
      console.log('⚠️ End marker not found, using content until end');
      extractedText = fullText.substring(startIndex);
    } else {
      extractedText = fullText.substring(startIndex, endIndex);
    }

    // Clean up the text
    const cleanedText = extractedText
      .replace(/\\r\\n/g, '\\n')  // Normalize line endings
      .replace(/\\n{3,}/g, '\\n\\n')  // Remove excessive line breaks
      .replace(/\\s+/g, ' ')      // Normalize whitespace
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
    const words = cleanedText.split(/\\s+/).length;
    const paragraphs = cleanedText.split(/\\n\\n+/).length;

    console.log('📊 Story Statistics:');
    console.log(`   📝 Sentences: ${sentences.length}`);
    console.log(`   📖 Words: ${words}`);
    console.log(`   📄 Paragraphs: ${paragraphs}`);

    // Preview first few sentences
    console.log('\\n📖 Story Preview:');
    sentences.slice(0, 3).forEach((sentence, i) => {
      console.log(`   ${i + 1}. ${sentence.trim()}.`);
    });

    return {
      text: cleanedText,
      filePath: cacheFilePath,
      stats: { sentences: sentences.length, words, paragraphs }
    };

  } catch (error) {
    console.error('❌ Failed to fetch Gift of the Magi:', error.message);
    throw error;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  fetchGiftOfTheMagi()
    .then(() => console.log('\\n✅ Gift of the Magi fetched successfully!'))
    .catch(console.error);
}

export { fetchGiftOfTheMagi };