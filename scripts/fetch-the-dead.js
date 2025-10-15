import fs from 'fs';
import path from 'path';

async function fetchTheDead() {
  console.log('📚 Fetching "The Dead" by James Joyce from Project Gutenberg...');

  try {
    // The Dead is part of Dubliners - Project Gutenberg ID 2814
    const url = 'https://www.gutenberg.org/files/2814/2814-0.txt';

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const fullText = await response.text();
    console.log(`📖 Downloaded ${fullText.length} characters`);

    // Extract "The Dead" story from Dubliners collection
    // "The Dead" is the last story in Dubliners
    const startMarker = 'THE DEAD';
    const endMarkers = [
      '*** END OF THE PROJECT GUTENBERG',
      'End of the Project Gutenberg',
      '*** END OF THIS PROJECT GUTENBERG',
      'THE END'
    ];

    const startIndex = fullText.indexOf(startMarker);
    if (startIndex === -1) {
      throw new Error('Could not find "THE DEAD" story start marker');
    }

    // Find the best end marker
    let endIndex = -1;
    let usedMarker = '';
    for (const marker of endMarkers) {
      const idx = fullText.indexOf(marker, startIndex);
      if (idx !== -1) {
        endIndex = idx;
        usedMarker = marker;
        break;
      }
    }

    if (endIndex === -1) {
      // Fallback: use the entire remaining text (since The Dead is the last story)
      endIndex = fullText.length;
      console.log('⚠️ Using entire remaining text (The Dead is last story)');
    } else {
      console.log(`📍 Found end marker: "${usedMarker}"`);
    }

    // Extract just "The Dead" story
    let storyText = fullText.substring(startIndex, endIndex);

    // Clean up the text
    storyText = storyText
      .replace(/THE DEAD\s*\n/, '') // Remove title
      .replace(/\r\n/g, '\n') // Normalize line endings
      .replace(/\n{3,}/g, '\n\n') // Replace multiple newlines with double
      .trim();

    console.log(`✂️ Extracted story: ${storyText.length} characters`);

    // Save to cache
    const cacheDir = path.join(process.cwd(), 'cache');
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }

    const outputPath = path.join(cacheDir, 'the-dead-original.txt');
    fs.writeFileSync(outputPath, storyText, 'utf8');

    console.log(`💾 Saved to: ${outputPath}`);

    // Basic validation
    const sentences = storyText.match(/[.!?]+/g) || [];
    console.log(`📊 Estimated sentences: ${sentences.length}`);

    if (sentences.length < 100) {
      console.warn('⚠️ Unexpectedly short - verify extraction');
    }

    console.log('✅ The Dead text fetch completed successfully!');

  } catch (error) {
    console.error('❌ Failed to fetch The Dead:', error.message);
    throw error;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  fetchTheDead()
    .then(() => console.log('🎉 Fetch completed!'))
    .catch(console.error);
}

export { fetchTheDead };