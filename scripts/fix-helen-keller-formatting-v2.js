const fs = require('fs');
const path = require('path');

const CACHE_FILE = path.join(__dirname, '..', 'cache', 'helen-keller-A1-simplified.json');
const OUTPUT_FILE = path.join(__dirname, '..', 'cache', 'helen-keller-A1-simplified.txt');

function fixFormatting() {
  console.log('🔧 Fixing formatting issues in A1 simplified text...');
  
  // Load sentences from cache (they're stored individually)
  const cacheData = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'));
  const sentences = cacheData.sentences || [];
  
  console.log(`📝 Processing ${sentences.length} sentences...`);
  
  // Process each sentence to ensure proper formatting
  const formattedSentences = sentences.map((sentence, index) => {
    let formatted = sentence.trim();
    
    // Ensure sentence ends with punctuation
    if (!/[.!?]$/.test(formatted)) {
      formatted += '.';
    }
    
    // Handle chapter headers separately
    if (formatted.match(/^CHAPTER [IVX]+$/i)) {
      return `\n\n${formatted}\n\n`;
    }
    
    return formatted;
  });
  
  // Join sentences with proper spacing
  let text = formattedSentences.join(' ');
  
  // Final cleanup
  text = text
    // Fix multiple spaces
    .replace(/\s{2,}/g, ' ')
    // Ensure proper spacing around chapter headers
    .replace(/(CHAPTER [IVX]+)/gi, '\n\n$1\n\n')
    // Normalize line breaks
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  
  fs.writeFileSync(OUTPUT_FILE, text, 'utf-8');
  
  const wordCount = text.split(/\s+/).length;
  const sentenceCount = text.match(/[^.!?]*[.!?]+/g) || [];
  
  console.log(`✅ Formatting fixed!`);
  console.log(`📊 Statistics:`);
  console.log(`   - Words: ${wordCount.toLocaleString()}`);
  console.log(`   - Sentences: ${sentenceCount.length}`);
  console.log(`   - Saved to: ${OUTPUT_FILE}`);
  
  // Show sample
  console.log(`\n📖 Sample (first 200 chars):`);
  console.log(text.substring(0, 200) + '...');
}

if (require.main === module) {
  fixFormatting();
}

module.exports = { fixFormatting };

