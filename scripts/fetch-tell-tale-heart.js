import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';

const BOOK_ID = 'tell-tale-heart';
// The Tell-Tale Heart is typically in Poe collections - trying common IDs
const GUTENBERG_IDS = [
  '2148',  // Tales of Mystery and Imagination (common Poe collection)
  '2147',  // Another Poe collection
  '25525', // Complete Works of Edgar Allan Poe
  '2151'   // Poe's Tales
];

async function fetchTellTaleHeart() {
  console.log('📖 Fetching "The Tell-Tale Heart" by Edgar Allan Poe...');
  
  let fullText = null;
  let usedId = null;

  // Try multiple Gutenberg IDs
  for (const gutenbergId of GUTENBERG_IDS) {
    try {
      const url = `https://www.gutenberg.org/files/${gutenbergId}/${gutenbergId}-0.txt`;
      console.log(`🔗 Trying Gutenberg ID ${gutenbergId}...`);
      
      const response = await fetch(url);
      if (!response.ok) {
        console.log(`   ❌ Failed: HTTP ${response.status}`);
        continue;
      }

      fullText = await response.text();
      
      // Check if it contains "Tell-Tale Heart" or "Tell Tale Heart"
      if (fullText.includes('Tell-Tale Heart') || fullText.includes('Tell Tale Heart') || 
          fullText.includes('TELL-TALE HEART') || fullText.includes('TELL TALE HEART')) {
        usedId = gutenbergId;
        console.log(`✅ Found in Gutenberg ID ${gutenbergId}`);
        break;
      } else {
        console.log(`   ⚠️ Text found but doesn't contain story title`);
        fullText = null;
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
      continue;
    }
  }

  if (!fullText) {
    throw new Error('Could not find "The Tell-Tale Heart" in tested Gutenberg collections. Please provide the correct Gutenberg ID or choose a different book.');
  }

  console.log(`📄 Downloaded ${fullText.length} characters from Gutenberg ID ${usedId}`);

  // Extract the story content
  // The Tell-Tale Heart typically starts with "True!—nervous—very, very dreadfully nervous"
  const startMarkers = [
    'True!—nervous—very, very dreadfully nervous',
    'TRUE!—nervous—very, very dreadfully nervous',
    'True! nervous—very, very dreadfully nervous',
    'The Tell-Tale Heart',
    'TELL-TALE HEART'
  ];

  const endMarkers = [
    'THE END',
    'End of the Project Gutenberg',
    '*** END OF THE PROJECT GUTENBERG EBOOK'
  ];

  let startIndex = -1;
  for (const marker of startMarkers) {
    startIndex = fullText.indexOf(marker);
    if (startIndex !== -1) {
      console.log(`✅ Found start marker: "${marker}"`);
      break;
    }
  }

  if (startIndex === -1) {
    // Try to find it after Gutenberg header
    const headerEnd = fullText.indexOf('*** START OF THE PROJECT GUTENBERG EBOOK');
    if (headerEnd !== -1) {
      startIndex = fullText.indexOf('\n', headerEnd) + 1;
      console.log('✅ Using content after Gutenberg header');
    } else {
      throw new Error('Could not find story start marker');
    }
  }

  // The Tell-Tale Heart ends with "It is the beating of his hideous heart!"
  // Next story "BERENICE" starts after that
  const storyEndMarkers = [
    'It is the beating of his hideous heart!',
    'It is the beating of his hideous heart',
    'BERENICE',
    'Berenice'
  ];

  let endIndex = -1;
  for (const marker of storyEndMarkers) {
    const foundIndex = fullText.indexOf(marker, startIndex);
    if (foundIndex !== -1) {
      if (marker === 'BERENICE' || marker === 'Berenice') {
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

  // Fallback to collection end markers if story-specific markers not found
  if (endIndex === -1) {
    for (const marker of endMarkers) {
      endIndex = fullText.indexOf(marker, startIndex);
      if (endIndex !== -1) {
        console.log(`✅ Found collection end marker: "${marker}"`);
        break;
      }
    }
  }

  let extractedText;
  if (endIndex === -1) {
    console.log('⚠️ End marker not found, using content until next story');
    // Try to find next story title as fallback
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

  // Clean up the text
  const cleanedText = extractedText
    .replace(/\r\n/g, '\n')  // Normalize line endings
    .replace(/\n{3,}/g, '\n\n')  // Remove excessive line breaks
    .replace(/[ \t]+/g, ' ')      // Normalize whitespace
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
    stats: { sentences: sentences.length, words, paragraphs },
    gutenbergId: usedId
  };
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  fetchTellTaleHeart()
    .then(() => console.log('\n✅ The Tell-Tale Heart fetched successfully!'))
    .catch(error => {
      console.error('\n❌ Failed to fetch The Tell-Tale Heart:', error.message);
      process.exit(1);
    });
}

export { fetchTellTaleHeart };

