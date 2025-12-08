import fs from 'fs';
import path from 'path';

/**
 * Clean José Hernández Biography Text
 * Step 2: Remove citations, format as narrative
 */

const STORY_ID = 'jose-hernandez';
const INPUT_FILE = `cache/${STORY_ID}-original.txt`;
const OUTPUT_FILE = `cache/${STORY_ID}-cleaned.txt`;

function cleanText() {
  console.log('🧹 Cleaning José Hernández biography text...');
  
  if (!fs.existsSync(INPUT_FILE)) {
    console.error(`❌ Input file not found: ${INPUT_FILE}`);
    process.exit(1);
  }

  let text = fs.readFileSync(INPUT_FILE, 'utf8');

  // Remove all Wikipedia citations [1], [2], etc.
  text = text.replace(/\[\d+\]/g, '');
  
  // Remove citation placeholders
  text = text.replace(/\[citation needed\]/gi, '');
  text = text.replace(/\[who\?\]/gi, '');
  text = text.replace(/\[when\?\]/gi, '');
  text = text.replace(/\[where\?\]/gi, '');
  text = text.replace(/\[clarification needed\]/gi, '');

  // Remove section headers that are inline
  text = text.replace(/\b(Early life|Engineering career|NASA career|Political career|Personal life|Awards|Filmography|See also)\b/gi, '');

  // Remove "Main article:" references
  text = text.replace(/Main article:.*?\./g, '');

  // Clean up whitespace
  text = text
    .replace(/\s+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  // Split into sentences for better formatting
  const sentences = text.split(/[.!?]+\s+/).filter(s => s.trim().length > 10);
  
  // Format as flowing narrative paragraphs (group 3-4 sentences)
  let formattedText = '';
  for (let i = 0; i < sentences.length; i++) {
    formattedText += sentences[i].trim();
    
    // Add period if missing
    if (!sentences[i].match(/[.!?]$/)) {
      formattedText += '.';
    }
    
    // Add paragraph break every 3-4 sentences
    if ((i + 1) % 4 === 0 && i < sentences.length - 1) {
      formattedText += '\n\n';
    } else if (i < sentences.length - 1) {
      formattedText += ' ';
    }
  }

  // Save cleaned text
  fs.writeFileSync(OUTPUT_FILE, formattedText, 'utf8');

  const stats = {
    characters: formattedText.length,
    words: formattedText.split(/\s+/).length,
    sentences: sentences.length,
    paragraphs: formattedText.split(/\n\s*\n/).filter(p => p.trim().length > 0).length
  };

  console.log('');
  console.log('✅ Text cleaned successfully!');
  console.log(`📄 File: ${OUTPUT_FILE}`);
  console.log(`📊 Stats:`);
  console.log(`   - Characters: ${stats.characters.toLocaleString()}`);
  console.log(`   - Words: ${stats.words.toLocaleString()}`);
  console.log(`   - Sentences: ${stats.sentences.toLocaleString()}`);
  console.log(`   - Paragraphs: ${stats.paragraphs.toLocaleString()}`);
  console.log('');
  console.log('🎯 Next steps:');
  console.log('   1. Review: cat cache/jose-hernandez-cleaned.txt');
  console.log('   2. Create background context (Step 3)');
  console.log('   3. Create emotional hook (Step 3.5)');
  console.log('   4. Simplify: node scripts/simplify-jose-hernandez.js A1');
  console.log('');
}

cleanText();

