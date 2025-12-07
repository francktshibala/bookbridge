const fs = require('fs');
const path = require('path');

const INPUT_FILE = path.join(__dirname, '..', 'cache', 'helen-keller-chapters-iii-iv-extracted.txt');
const OUTPUT_FILE = path.join(__dirname, '..', 'cache', 'helen-keller-original.txt');

function cleanHelenKellerText() {
  console.log('🧹 Cleaning Helen Keller Chapters III-IV text...');
  
  // Read extracted chapters
  let text = fs.readFileSync(INPUT_FILE, 'utf-8');
  
  // Split by chapter headers
  const chapters = text.split(/(?=^CHAPTER [IVX]+$)/m);
  
  let cleanedText = '';
  
  for (let chapter of chapters) {
    if (!chapter.trim()) continue;
    
    // Check if this is a chapter header
    const chapterMatch = chapter.match(/^(CHAPTER [IVX]+)\s*\n/);
    if (chapterMatch) {
      // Add chapter header with spacing
      cleanedText += `\n\n${chapterMatch[1]}\n\n`;
      // Remove chapter header from content
      chapter = chapter.replace(/^CHAPTER [IVX]+\s*\n+/, '');
    }
    
    // Clean up the chapter content
    let content = chapter
      // Normalize line endings
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      // Remove excessive blank lines (more than 2 consecutive)
      .replace(/\n{3,}/g, '\n\n')
      // Join lines that don't end with sentence-ending punctuation
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .join(' ')
      // Fix spacing around punctuation
      .replace(/\s+([.!?,:;])/g, '$1')
      .replace(/([.!?])\s+/g, '$1 ')
      // Fix spacing around quotes
      .replace(/\s+"/g, '"')
      .replace(/"\s+/g, '" ')
      // Fix spacing around dashes
      .replace(/\s+--\s+/g, ' -- ')
      .replace(/\s+-\s+/g, ' - ')
      // Normalize multiple spaces
      .replace(/\s{2,}/g, ' ')
      .trim();
    
    // Split into paragraphs (by double spaces or sentence endings followed by capital)
    const paragraphs = content
      .split(/(?<=[.!?])\s+(?=[A-Z])/)
      .map(p => p.trim())
      .filter(p => p.length > 0);
    
    // Join paragraphs with double newlines
    cleanedText += paragraphs.join('\n\n');
  }
  
  // Final cleanup
  cleanedText = cleanedText
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  
  // Save cleaned text
  fs.writeFileSync(OUTPUT_FILE, cleanedText, 'utf-8');
  
  const wordCount = cleanedText.split(/\s+/).length;
  const charCount = cleanedText.length;
  
  console.log(`✅ Cleaned text saved to: ${OUTPUT_FILE}`);
  console.log(`📊 Statistics:`);
  console.log(`   - Characters: ${charCount.toLocaleString()}`);
  console.log(`   - Words: ${wordCount.toLocaleString()}`);
  console.log(`   - Estimated reading time: ~${Math.round(wordCount / 200)} minutes`);
  
  return cleanedText;
}

if (require.main === module) {
  cleanHelenKellerText();
}

module.exports = { cleanHelenKellerText };

