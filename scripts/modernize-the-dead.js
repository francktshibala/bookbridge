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

const BOOK_ID = 'the-dead';
const CACHE_DIR = path.join(process.cwd(), 'cache');
const INPUT_FILE = path.join(CACHE_DIR, `${BOOK_ID}-original.txt`);
const OUTPUT_FILE = path.join(CACHE_DIR, `${BOOK_ID}-modernized.txt`);

async function modernizeLadyWithDog() {
  console.log('🔄 Modernizing "The Dead" by Anton Chekhov...');

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
- Maintain Anton Chekhov's literary style and psychological depth
- Keep all proper nouns unchanged
- Preserve the realistic narrative structure

MODERNIZATION FOCUS FOR 1890s RUSSIAN TEXT:
- "motor-car" → "car"
- "telephone" → "phone"
- Overly formal Victorian dialogue → more natural conversation
- Archaic expressions → contemporary equivalents
- Dated social attitudes → contemporary phrasing while preserving meaning
- Russian formal address patterns → slightly more casual but still polite

EXAMPLES:
- "pray tell" → "please tell me"
- "by-the-bye" → "by the way"
- "upon my word" → "honestly" or "really"
- Very formal address patterns → slightly more casual but still polite
- "motor-car" → "car"
- "Crown Department" → "government department"

PRESERVE:
- All character names (Dmitri Dmitritch Gurov, Anna Sergeyevna, etc.)
- All place names (Yalta, Moscow, Petersburg, etc.)
- The psychological complexity and emotional depth
- The realistic portrayal of human relationships

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
  modernizeLadyWithDog()
    .then(() => console.log('\n✅ The Dead modernized successfully!'))
    .catch(console.error);
}

export { modernizeLadyWithDog };