const fs = require('fs');
const path = require('path');
const OpenAI = require('openai');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const INPUT_FILE = path.join(__dirname, '..', 'cache', 'helen-keller-original.txt');
const OUTPUT_FILE = path.join(__dirname, '..', 'cache', 'helen-keller-modernized.txt');
const CACHE_FILE = path.join(__dirname, '..', 'cache', 'helen-keller-modernized.json');

async function modernizeHelenKeller() {
  console.log('🔄 Starting modernization of Helen Keller\'s "The Story of My Life" (Chapters III-IV)...');
  console.log('📋 Strategy: Conservative modernization - preserve emotional power and story meaning exactly');

  // Check for cached results first
  if (fs.existsSync(CACHE_FILE) && !process.argv.includes('--fresh')) {
    console.log('💾 Found cached modernization, loading...');
    try {
      const cached = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
      console.log(`✅ Loaded ${cached.chunks.length} cached chunks`);

      // Combine cached chunks and save
      const modernizedText = cached.chunks.map(chunk => chunk.modernized).join('\n\n');
      fs.writeFileSync(OUTPUT_FILE, modernizedText, 'utf8');

      console.log(`✅ Modernized text saved to: ${OUTPUT_FILE}`);
      await generateStats(modernizedText);
      return;
    } catch (error) {
      console.log('❌ Cache file corrupted, proceeding with fresh modernization');
    }
  }

  // Read original text
  const originalText = fs.readFileSync(INPUT_FILE, 'utf8');
  console.log(`📖 Processing ${originalText.length.toLocaleString()} characters`);

  // Split into paragraphs (preserve chapter structure)
  const paragraphs = originalText.split(/\n\s*\n/).filter(p => p.trim().length > 0);
  console.log(`📑 Processing ${paragraphs.length} paragraphs`);

  // Process in batches of 3-5 paragraphs for better context
  const chunks = [];
  const batchSize = 4;

  for (let i = 0; i < paragraphs.length; i += batchSize) {
    const batch = paragraphs.slice(i, i + batchSize);
    chunks.push({
      index: Math.floor(i / batchSize),
      original: batch.join('\n\n'),
      paragraphStart: i + 1,
      paragraphEnd: Math.min(i + batchSize, paragraphs.length)
    });
  }

  console.log(`🔄 Processing ${chunks.length} chunks`);

  const modernizedChunks = [];

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    console.log(`Processing chunk ${i + 1}/${chunks.length} (paragraphs ${chunk.paragraphStart}-${chunk.paragraphEnd})...`);

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are modernizing Helen Keller's memoir "The Story of My Life" (published 1903) for contemporary readers while preserving the story and emotional power exactly.

CRITICAL RULES:
- PRESERVE STORY MEANING 100% - no plot changes, no character changes
- PRESERVE EMOTIONAL POWER - maintain the intensity and impact of Helen's voice
- Convert archaic/dated language to contemporary equivalents
- Maintain the same narrative structure and paragraph breaks
- Keep all proper nouns unchanged: Helen Keller, Anne Mansfield Sullivan, Dr. Alexander Graham Bell, Mr. Anagnos, Perkins Institution, Tuscumbia, Baltimore, Washington, etc.
- Preserve the first-person narrative voice and personal tone

MODERNIZATION EXAMPLES (1903 → Contemporary):
- "awhile" → "a while"
- "some one" → "someone"
- "any one" → "anyone"
- "every one" → "everyone"
- "out-of-the-way" → "out of the way" (or keep hyphen if it reads better)
- "motor-car" → "car" (if any)
- "telephone" → "phone" (if any)
- Update Victorian formalities to modern conversational tone where appropriate
- Modernize outdated expressions while keeping meaning

SENTENCE STRUCTURE:
- Keep sentence structure mostly the same (1903 English is already fairly modern)
- Only break up extremely long sentences if they're hard to follow
- Maintain Helen's distinctive voice and writing style

Return ONLY the modernized text, no explanations.`
          },
          {
            role: 'user',
            content: chunk.original
          }
        ],
        temperature: 0.2,
        max_tokens: 2000
      });

      const modernizedChunk = response.choices[0].message.content.trim();

      modernizedChunks.push({
        index: chunk.index,
        original: chunk.original,
        modernized: modernizedChunk,
        paragraphRange: `${chunk.paragraphStart}-${chunk.paragraphEnd}`
      });

      // Save progress to cache after each chunk
      const cacheData = {
        title: 'Helen Keller - The Story of My Life (Chapters III-IV) - Modernization',
        processedAt: new Date().toISOString(),
        totalChunks: chunks.length,
        completedChunks: modernizedChunks.length,
        chunks: modernizedChunks
      };

      fs.writeFileSync(CACHE_FILE, JSON.stringify(cacheData, null, 2), 'utf8');

      console.log(`  ✅ Chunk ${i + 1} complete (${modernizedChunk.length} characters)`);

      // Small delay to be respectful to API
      await new Promise(resolve => setTimeout(resolve, 500));

    } catch (error) {
      console.error(`❌ Error processing chunk ${i + 1}:`, error.message);
      throw error;
    }
  }

  // Combine all modernized chunks
  const modernizedText = modernizedChunks.map(chunk => chunk.modernized).join('\n\n');

  // Save modernized text
  fs.writeFileSync(OUTPUT_FILE, modernizedText, 'utf8');

  console.log(`✅ Modernization complete!`);
  console.log(`📁 Modernized text saved to: ${OUTPUT_FILE}`);
  console.log(`💾 Cache saved to: ${CACHE_FILE}`);

  await generateStats(modernizedText);
}

async function generateStats(text) {
  const words = text.split(/\s+/).length;
  const sentences = text.match(/[^.!?]*[.!?]/g) || [];
  const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);

  console.log(`\n📊 Modernized Text Statistics:`);
  console.log(`   - Characters: ${text.length.toLocaleString()}`);
  console.log(`   - Words: ${words.toLocaleString()}`);
  console.log(`   - Sentences: ${sentences.length}`);
  console.log(`   - Paragraphs: ${paragraphs.length}`);
  console.log(`   - Estimated reading time: ~${Math.round(words / 200)} minutes`);
}

if (require.main === module) {
  modernizeHelenKeller().catch(console.error);
}

module.exports = { modernizeHelenKeller };

