import fs from 'fs';
import path from 'path';

const BOOK_INFO = {
  id: 'after-twenty-years',
  title: 'After Twenty Years',
  author: 'O. Henry',
  gutenbergId: '2776', // The Four Million collection
  gutenbergUrl: `https://www.gutenberg.org/files/2776/2776-0.txt`,
  startMarker: 'The policeman on the beat moved up the avenue impressively.',
  endMarkers: [
    'JIMMY.', // End of story (note from Jimmy)
    'LOST ON DRESS PARADE', // Next story in collection
    'Lost on Dress Parade',
    'THE END'
  ]
};

async function fetchAfterTwentyYears() {
  console.log(`📖 Fetching "${BOOK_INFO.title}" by ${BOOK_INFO.author}...`);
  console.log(`🔗 Trying Gutenberg ID ${BOOK_INFO.gutenbergId}...`);

  try {
    const response = await fetch(BOOK_INFO.gutenbergUrl);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const fullText = await response.text();
    console.log(`📄 Downloaded ${fullText.length} characters from Gutenberg ID ${BOOK_INFO.gutenbergId}`);

    const startIndex = fullText.indexOf(BOOK_INFO.startMarker);
    if (startIndex === -1) {
      throw new Error('Could not find story start marker');
    }
    console.log(`✅ Found start marker: "${BOOK_INFO.startMarker.substring(0, 50)}..."`);

    let endIndex = -1;
    for (const marker of BOOK_INFO.endMarkers) {
      const foundIndex = fullText.indexOf(marker, startIndex);
      if (foundIndex !== -1) {
        if (marker === 'THE FURNISHED ROOM' || marker === 'The Furnished Room' || marker === 'A FURNISHED ROOM') {
          // Story ends before next story title
          endIndex = foundIndex;
          console.log(`✅ Found next story marker: "${marker}" - story ends before this`);
          break;
        } else {
          // Found the actual ending line
          endIndex = foundIndex + marker.length;
          console.log(`✅ Found story end marker: "${marker}"`);
          break;
        }
      }
    }

    let extractedText;
    if (endIndex === -1) {
      console.log('⚠️ End marker not found, using content until next story');
      // Fallback: try to find next story title as a boundary
      const nextStoryMatch = fullText.substring(startIndex).match(/\n[A-Z]{3,}\n/);
      if (nextStoryMatch) {
        endIndex = startIndex + nextStoryMatch.index;
        console.log('✅ Using next story title as boundary');
      } else {
        extractedText = fullText.substring(startIndex);
      }
    }
    
    if (!extractedText) {
      extractedText = fullText.substring(startIndex, endIndex);
    }

    const cleanedText = extractedText
      .replace(/\r\n/g, '\n')           // Normalize line endings
      .replace(/\n{3,}/g, '\n\n')       // Reduce multiple newlines
      .replace(/[ \t]+/g, ' ')          // Normalize spaces
      .trim();

    console.log(`✂️ Extracted story: ${cleanedText.length} characters`);

    const cacheDir = path.join(process.cwd(), 'cache');
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }

    const cacheFilePath = path.join(cacheDir, `${BOOK_INFO.id}-original.txt`);
    fs.writeFileSync(cacheFilePath, cleanedText, 'utf8');
    console.log(`💾 Saved to: ${cacheFilePath}`);

    const sentences = cleanedText.match(/[^.!?]*[.!?]/g) || [];
    const words = cleanedText.split(/\s+/).length;
    const paragraphs = cleanedText.split(/\n\n+/).length;

    console.log('📊 Story Statistics:');
    console.log(`   📝 Sentences: ${sentences.length}`);
    console.log(`   📖 Words: ${words}`);
    console.log(`   📄 Paragraphs: ${paragraphs}`);

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
    console.error(`❌ Failed to fetch ${BOOK_INFO.title}:`, error.message);
    throw error;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  fetchAfterTwentyYears()
    .then(() => console.log('\n✅ After Twenty Years fetched successfully!'))
    .catch(console.error);
}

export { fetchAfterTwentyYears };

