import { PrismaClient } from '@prisma/client';
import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const BOOK_ID = 'the-devoted-friend';
const CACHE_DIR = path.join(process.cwd(), 'cache');
const INPUT_FILE = path.join(CACHE_DIR, `${BOOK_ID}-original.txt`);
const OUTPUT_FILE = path.join(CACHE_DIR, `${BOOK_ID}-modernized.txt`);

async function modernizeTheDevotedFriend() {
  console.log('🔄 Modernizing "The Devoted Friend" by Oscar Wilde...');

  // Check if --fresh flag is provided
  const isFresh = process.argv.includes('--fresh');

  // Check if modernized file already exists
  if (fs.existsSync(OUTPUT_FILE) && !isFresh) {
    console.log('📄 Modernized file already exists. Use --fresh to regenerate.');
    const existingText = fs.readFileSync(OUTPUT_FILE, 'utf8');
    console.log(`✅ Using existing modernized text: ${existingText.length} characters`);
    return existingText;
  }

  // Read original text
  if (!fs.existsSync(INPUT_FILE)) {
    throw new Error(`Original text file not found: ${INPUT_FILE}`);
  }

  const originalText = fs.readFileSync(INPUT_FILE, 'utf8');
  console.log(`📖 Original text loaded: ${originalText.length} characters`);

  // Modernization prompt for Victorian era text
  const modernizationPrompt = `
CRITICAL RULES:
- PRESERVE STORY MEANING 100% - no plot changes
- Modernize dated expressions for contemporary understanding
- Maintain Oscar Wilde's literary style and wit
- Keep all proper nouns unchanged
- Preserve the fairy tale narrative structure

MODERNIZATION FOCUS FOR 1890s TEXT:
- "by-the-bye" → "by the way"
- "pray" (as in "pray tell") → "please" or remove
- Overly formal Victorian dialogue → more natural conversation
- Archaic expressions → contemporary equivalents
- Dated social attitudes → contemporary phrasing while preserving meaning

EXAMPLES:
- "pray get it at once" → "please get it right away"
- "by-the-bye" → "by the way"
- "upon my word" → "honestly" or "really"
- Very formal address patterns → slightly more casual but still polite

Return ONLY the modernized text, no explanations.

Text to modernize:
${originalText}
`;

  try {
    console.log('🤖 Sending text to OpenAI for modernization...');

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: modernizationPrompt
        }
      ],
      temperature: 0.3, // Lower temperature for consistency
      max_tokens: 8000
    });

    const modernizedText = response.choices[0].message.content.trim();
    console.log(`✨ Modernization complete: ${modernizedText.length} characters`);

    // Save modernized text
    if (!fs.existsSync(CACHE_DIR)) {
      fs.mkdirSync(CACHE_DIR, { recursive: true });
    }

    fs.writeFileSync(OUTPUT_FILE, modernizedText, 'utf8');
    console.log(`💾 Saved modernized text to: ${OUTPUT_FILE}`);

    // Show preview
    const sentences = modernizedText.split(/[.!?]+/).filter(s => s.trim().length > 10);
    console.log('\n📖 Modernized Text Preview:');
    sentences.slice(0, 3).forEach((sentence, i) => {
      console.log(`   ${i + 1}. ${sentence.trim()}.`);
    });

    console.log(`\n📊 Modernization Statistics:`);
    console.log(`   Original: ${originalText.length} characters`);
    console.log(`   Modernized: ${modernizedText.length} characters`);
    console.log(`   Difference: ${modernizedText.length - originalText.length} characters`);

    return modernizedText;

  } catch (error) {
    console.error('❌ Modernization failed:', error.message);
    throw error;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  modernizeTheDevotedFriend()
    .then(() => console.log('\n✅ The Devoted Friend modernized successfully!'))
    .catch(console.error);
}

export { modernizeTheDevotedFriend };