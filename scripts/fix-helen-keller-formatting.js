const fs = require('fs');
const path = require('path');

const INPUT_FILE = path.join(__dirname, '..', 'cache', 'helen-keller-A1-simplified.txt');
const OUTPUT_FILE = path.join(__dirname, '..', 'cache', 'helen-keller-A1-simplified.txt');

function fixFormatting() {
  console.log('🔧 Fixing formatting issues in A1 simplified text...');
  
  let text = fs.readFileSync(INPUT_FILE, 'utf-8');
  
  // Fix: Add space after periods before capital letters (but not after abbreviations)
  text = text
    // Fix sentences running together (period followed by capital letter without space)
    .replace(/\.([A-Z])/g, '. $1')
    // Fix lowercase followed by capital (missing period)
    .replace(/([a-z])([A-Z][a-z])/g, '$1. $2')
    // Fix missing space after periods in quotes
    .replace(/\.(")/g, '. $1')
    // Fix multiple spaces
    .replace(/\s{2,}/g, ' ')
    // Fix missing space before chapter headers
    .replace(/([.!?])(CHAPTER [IVX]+)/g, '$1\n\n$2')
    // Ensure proper spacing around chapter headers
    .replace(/(CHAPTER [IVX]+)/g, '\n\n$1\n\n')
    // Normalize line breaks
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  
  fs.writeFileSync(OUTPUT_FILE, text, 'utf-8');
  
  const wordCount = text.split(/\s+/).length;
  const sentences = text.match(/[^.!?]*[.!?]+/g) || [];
  
  console.log(`✅ Formatting fixed!`);
  console.log(`📊 Statistics:`);
  console.log(`   - Words: ${wordCount.toLocaleString()}`);
  console.log(`   - Sentences: ${sentences.length}`);
  console.log(`   - Saved to: ${OUTPUT_FILE}`);
}

if (require.main === module) {
  fixFormatting();
}

module.exports = { fixFormatting };

