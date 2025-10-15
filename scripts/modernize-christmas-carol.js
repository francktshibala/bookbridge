import fs from 'fs';
import OpenAI from 'openai';
import path from 'path';
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Absolute path resolution (Lesson from pipeline)
const PROJECT_ROOT = path.resolve(process.cwd());
const INPUT_FILE = path.join(PROJECT_ROOT, 'data/christmas-carol/original.txt');
const OUTPUT_FILE = path.join(PROJECT_ROOT, 'data/christmas-carol/modernized.txt');
const CACHE_FILE = path.join(PROJECT_ROOT, 'cache/christmas-carol-modernized.json');

// CLI flags for control
const args = process.argv.slice(2);
const clearCache = args.includes('--clear-cache');
const freshRun = args.includes('--fresh');

async function modernizeChristmasCarol() {
  console.log('🎄 Starting modernization of "A Christmas Carol"...');
  console.log('📋 Strategy: Victorian → Contemporary while preserving Dickens\' style');

  // Clear cache if requested
  if (clearCache && fs.existsSync(CACHE_FILE)) {
    fs.unlinkSync(CACHE_FILE);
    console.log('🗑️ Cache cleared');
  }

  // Check for cached results first
  if (!freshRun && fs.existsSync(CACHE_FILE)) {
    console.log('💾 Found cached modernization, loading...');
    try {
      const cached = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));

      // Cache validation (from pipeline lessons)
      if (cached.totalChunks && cached.chunks.length >= cached.totalChunks) {
        console.log(`✅ Complete cache found: ${cached.chunks.length} chunks`);

        // Combine cached chunks and save
        const modernizedText = cached.chunks.map(chunk => chunk.modernized).join('\n\n');

        // Create output directory
        const outputDir = path.dirname(OUTPUT_FILE);
        if (!fs.existsSync(outputDir)) {
          fs.mkdirSync(outputDir, { recursive: true });
        }

        fs.writeFileSync(OUTPUT_FILE, modernizedText, 'utf8');

        console.log(`✅ Modernized text saved to: ${OUTPUT_FILE}`);
        await generateStats(modernizedText);
        return;
      }
    } catch (error) {
      console.log('❌ Cache file corrupted, proceeding with fresh modernization');
    }
  }

  // Create cache directory
  const cacheDir = path.dirname(CACHE_FILE);
  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true });
  }

  // Read original text
  const originalText = fs.readFileSync(INPUT_FILE, 'utf8');
  console.log(`📖 Processing ${originalText.length.toLocaleString()} characters`);

  // Split into manageable chunks by word count for large texts
  const words = originalText.split(/\s+/);
  console.log(`📝 Processing ${words.length} words total`);

  const chunks = [];
  const wordsPerChunk = 1000; // Smaller chunks for large text

  for (let i = 0; i < words.length; i += wordsPerChunk) {
    const chunkWords = words.slice(i, i + wordsPerChunk);
    const chunkText = chunkWords.join(' ');

    chunks.push({
      index: Math.floor(i / wordsPerChunk),
      original: chunkText,
      wordStart: i + 1,
      wordEnd: Math.min(i + wordsPerChunk, words.length)
    });
  }

  console.log(`🔄 Processing ${chunks.length} chunks`);

  // Initialize cache structure
  const cacheData = {
    title: 'A Christmas Carol',
    author: 'Charles Dickens',
    totalChunks: chunks.length,
    chunks: [],
    lastUpdated: new Date().toISOString()
  };

  const modernizedChunks = [];

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    console.log(`Processing chunk ${i + 1}/${chunks.length} (words ${chunk.wordStart}-${chunk.wordEnd})...`);

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: `You are modernizing "A Christmas Carol" by Charles Dickens for contemporary readers while preserving the story exactly.

CRITICAL RULES:
- PRESERVE STORY MEANING 100% - no plot changes, no character changes
- Modernize Victorian language for contemporary understanding
- Maintain Dickens' rich descriptive style and emotional depth
- Keep all proper nouns unchanged (Scrooge, Bob Cratchit, etc.)
- Preserve the Christmas spirit and moral themes

MODERNIZATION FOCUS:
- "humbug" can stay (it's part of the character)
- "thou/thee/thy" → "you/your"
- "hath/doth" → "has/does"
- Complex Victorian sentence structures → clearer modern flow
- Outdated social attitudes → contemporary phrasing
- "motor-car" → "car" (if any)
- "telephone" → "phone" (if any)
- Victorian monetary terms → modern equivalents where needed

STYLE PRESERVATION:
- Keep Dickens' poetic language and metaphors
- Maintain emotional intensity of the ghosts and visions
- Preserve the contrast between Scrooge's coldness and warmth
- Keep festive descriptions vivid and magical

Return ONLY the modernized text, no explanations.`
          },
          {
            role: 'user',
            content: `Modernize this section of "A Christmas Carol":\n\n${chunk.original}`
          }
        ],
        temperature: 0.3, // Lower temperature for consistent modernization
        max_tokens: 4000
      });

      const modernizedText = response.choices[0]?.message?.content?.trim();

      if (!modernizedText) {
        throw new Error('Empty response from OpenAI');
      }

      const processedChunk = {
        ...chunk,
        modernized: modernizedText,
        processedAt: new Date().toISOString()
      };

      modernizedChunks.push(processedChunk);
      cacheData.chunks.push(processedChunk);

      // Save progress to cache after each chunk
      fs.writeFileSync(CACHE_FILE, JSON.stringify(cacheData, null, 2));

      console.log(`✅ Chunk ${i + 1} completed (${modernizedText.length} chars)`);

      // Rate limiting - small delay between requests
      if (i < chunks.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

    } catch (error) {
      console.error(`❌ Error processing chunk ${i + 1}:`, error.message);

      // Save progress and exit
      fs.writeFileSync(CACHE_FILE, JSON.stringify(cacheData, null, 2));

      console.log(`💾 Progress saved to cache. Resume with: node scripts/modernize-christmas-carol.js`);
      process.exit(1);
    }
  }

  // Combine all modernized chunks
  const finalModernizedText = modernizedChunks.map(chunk => chunk.modernized).join('\n\n');

  // Create output directory
  const outputDir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Save the final modernized text
  fs.writeFileSync(OUTPUT_FILE, finalModernizedText, 'utf8');

  console.log(`✅ Modernization complete!`);
  console.log(`📄 Output saved to: ${OUTPUT_FILE}`);
  console.log(`💾 Cache saved to: ${CACHE_FILE}`);

  await generateStats(finalModernizedText);
}

async function generateStats(modernizedText) {
  console.log('\n📊 MODERNIZATION STATISTICS:');
  console.log(`📝 Final length: ${modernizedText.length.toLocaleString()} characters`);

  const sentences = modernizedText.split(/[.!?]+/).filter(s => s.trim().length > 10);
  console.log(`📋 Estimated sentences: ${sentences.length.toLocaleString()}`);
  console.log(`💰 Estimated A1 simplification cost: ~$${(sentences.length * 0.01).toFixed(2)}`);
  console.log(`🎵 Estimated audio generation cost: ~$${(sentences.length * 0.01).toFixed(2)}`);

  // Sample some modernized text
  const firstParagraph = modernizedText.split('\n\n')[0];
  console.log('\n🔍 SAMPLE MODERNIZED TEXT:');
  console.log(firstParagraph.substring(0, 200) + '...');
}

// Run the script
modernizeChristmasCarol().catch(error => {
  console.error('❌ Script failed:', error.message);
  process.exit(1);
});