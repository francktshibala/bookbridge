import fs from 'fs';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const INPUT_FILE = 'data/sleepy-hollow/original.txt';
const OUTPUT_FILE = 'data/sleepy-hollow/modernized.txt';
const CACHE_FILE = 'cache/sleepy-hollow-modernized.json';

async function modernizeSleepyHollow() {
  console.log('🔄 Starting modernization of "The Legend of Sleepy Hollow"...');
  console.log('📋 Strategy: Conservative modernization - preserve story meaning exactly');

  // Check for cached results first
  if (fs.existsSync(CACHE_FILE)) {
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

  // Create cache directory
  if (!fs.existsSync('./cache')) {
    fs.mkdirSync('./cache', { recursive: true });
  }

  // Read original text
  const originalText = fs.readFileSync(INPUT_FILE, 'utf8');
  console.log(`📖 Processing ${originalText.length.toLocaleString()} characters`);

  // Split into manageable chunks (preserve paragraph boundaries)
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
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: `You are modernizing "The Legend of Sleepy Hollow" for contemporary readers while preserving the story exactly.

CRITICAL RULES:
- PRESERVE STORY MEANING 100% - no plot changes, no character changes
- Convert archaic language to contemporary equivalents
- Maintain the same narrative structure and paragraph breaks
- Keep all proper nouns, place names, and character names unchanged
- Preserve the atmospheric and descriptive tone of Irving's writing

MODERNIZATION EXAMPLES:
- "denominated by" → "called by" or "known as"
- "prudently" → "carefully" or "wisely"
- "beheld" → "saw" or "observed"
- "tarried" → "stayed" or "remained"
- "ye olde" → "the old"
- "Master Hendrick Hudson" → "Henry Hudson" (use modern name form)
- "powwows" → "meetings" or "gatherings"

SENTENCE STRUCTURE:
- Break up very long Victorian sentences into 2-3 shorter modern sentences
- Maintain the same information and flow
- Keep the storytelling rhythm

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

      const modernizedChunk = response.choices[0].message.content;

      modernizedChunks.push({
        index: chunk.index,
        original: chunk.original,
        modernized: modernizedChunk,
        paragraphRange: `${chunk.paragraphStart}-${chunk.paragraphEnd}`
      });

      // Save progress to cache after each chunk
      const cacheData = {
        title: 'The Legend of Sleepy Hollow - Modernization',
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

  console.log('');
  console.log('🚀 Next steps:');
  console.log('1. Review modernized text for quality');
  console.log('2. Create simplification script: node scripts/simplify-sleepy-hollow.js B1');
}

async function generateStats(modernizedText) {
  const originalText = fs.readFileSync(INPUT_FILE, 'utf8');

  // Basic stats
  const originalWords = originalText.split(/\s+/).length;
  const modernizedWords = modernizedText.split(/\s+/).length;
  const originalSentences = originalText.split(/[.!?]+\s+/).filter(s => s.trim().length > 20).length;
  const modernizedSentences = modernizedText.split(/[.!?]+\s+/).filter(s => s.trim().length > 20).length;

  console.log('');
  console.log('📊 Modernization Statistics:');
  console.log(`   Original text: ${originalWords.toLocaleString()} words, ${originalSentences} sentences`);
  console.log(`   Modernized text: ${modernizedWords.toLocaleString()} words, ${modernizedSentences} sentences`);
  console.log(`   Word change: ${modernizedWords > originalWords ? '+' : ''}${modernizedWords - originalWords} (${((modernizedWords - originalWords) / originalWords * 100).toFixed(1)}%)`);
  console.log(`   Sentence change: ${modernizedSentences > originalSentences ? '+' : ''}${modernizedSentences - originalSentences} (${((modernizedSentences - originalSentences) / originalSentences * 100).toFixed(1)}%)`);

  // Save modernization metadata
  const metadata = {
    title: 'The Legend of Sleepy Hollow - Modernized',
    author: 'Washington Irving (modernized)',
    processedAt: new Date().toISOString(),
    stats: {
      original: {
        words: originalWords,
        sentences: originalSentences,
        characters: originalText.length
      },
      modernized: {
        words: modernizedWords,
        sentences: modernizedSentences,
        characters: modernizedText.length
      },
      changes: {
        wordDelta: modernizedWords - originalWords,
        sentenceDelta: modernizedSentences - originalSentences,
        wordChangePercent: ((modernizedWords - originalWords) / originalWords * 100),
        sentenceChangePercent: ((modernizedSentences - originalSentences) / originalSentences * 100)
      }
    },
    processing: {
      strategy: 'conservative_modernization',
      preserveStoryMeaning: true,
      model: 'gpt-4-turbo-preview',
      batchSize: 4
    }
  };

  fs.writeFileSync(
    'data/sleepy-hollow/modernization-metadata.json',
    JSON.stringify(metadata, null, 2),
    'utf8'
  );

  console.log(`📋 Modernization metadata saved to: data/sleepy-hollow/modernization-metadata.json`);
}

modernizeSleepyHollow()
  .then(() => {
    console.log('🎉 Modernization process complete!');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Modernization failed:', error);
    process.exit(1);
  });