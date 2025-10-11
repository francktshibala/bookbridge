import fs from 'fs';
import path from 'path';

const BOOK_ID = 'lady-with-dog';
const GUTENBERG_ID = '13415';
const GUTENBERG_URL = `https://www.gutenberg.org/files/${GUTENBERG_ID}/${GUTENBERG_ID}-0.txt`;

async function fetchLadyWithDog() {
  console.log('📖 Fetching "The Lady with the Dog" by Anton Chekhov...');
  console.log(`🔗 Source: Project Gutenberg ID ${GUTENBERG_ID}`);

  try {
    // Fetch the text from Project Gutenberg
    const response = await fetch(GUTENBERG_URL);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const fullText = await response.text();
    console.log(`📄 Downloaded ${fullText.length} characters`);

    // Extract "The Lady with the Dog" story from the collection
    const startMarker = 'IT was said that a new person had appeared on the sea-front: a lady with';
    const endMarker = 'A DOCTOR\'S VISIT';

    const startIndex = fullText.indexOf(startMarker);
    let endIndex = fullText.indexOf(endMarker, startIndex + startMarker.length);

    if (startIndex === -1) {
      throw new Error('Story start marker not found');
    }

    let extractedText;
    if (endIndex === -1) {
      console.log('⚠️ End marker not found, using content until end of text');
      extractedText = fullText.substring(startIndex);
    } else {
      extractedText = fullText.substring(startIndex, endIndex);
    }

    // Clean up the text
    const cleanedText = extractedText
      .replace(/\r\n/g, '\n')  // Normalize line endings
      .replace(/\n{3,}/g, '\n\n')  // Remove excessive line breaks
      .replace(/\s+/g, ' ')      // Normalize whitespace
      .replace(/^THE LADY WITH THE DOG.*?(?=IT)/s, '') // Remove everything before "IT was said"
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
    console.error('❌ Failed to fetch The Lady with the Dog:', error.message);
    throw error;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  fetchLadyWithDog()
    .then(() => console.log('\n✅ The Lady with the Dog fetched successfully!'))
    .catch(console.error);
}

export { fetchLadyWithDog };