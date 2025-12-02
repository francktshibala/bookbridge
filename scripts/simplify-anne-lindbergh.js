import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import { config } from 'dotenv';

config({ path: '.env.local' });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const CONTENT_ID = 'anne-lindbergh';
const LEVEL = process.argv[2] || 'A1'; // Accept level as command line argument

const originalTextPath = path.join(process.cwd(), `cache/${CONTENT_ID}-original.txt`);
const outputPath = path.join(process.cwd(), `cache/${CONTENT_ID}-${LEVEL.toLowerCase()}-simplified.txt`);

// Check if original text exists
if (!fs.existsSync(originalTextPath)) {
  console.error(`❌ Original text not found: ${originalTextPath}`);
  console.log('💡 Run fetch script first: node scripts/fetch-anne-lindbergh.js');
  process.exit(1);
}

const originalText = fs.readFileSync(originalTextPath, 'utf8');

// Level-specific prompts
const levelPrompts = {
  A1: `You are an expert ESL content creator. Simplify this VOA biography to A1 CEFR level.

A1 Level Requirements:
- Use only 800-1,000 word vocabulary (most common English words)
- Create simple, short sentences (5-10 words each)
- Use present simple tense primarily
- Avoid complex grammar (no passive voice, conditionals, or subordinate clauses)
- Use concrete, everyday words
- Natural, clear flow
- Keep the same message and key events

CRITICAL RULES:
- Maintain the core story about Anne Lindbergh's life
- Preserve key events: flying with Charles, baby's kidnapping, writing books, "Gift from the Sea"
- Keep the emotional impact
- DO NOT add new content or interpretations
- Return ONLY the simplified text, no explanations
- Maintain approximately the same number of sentences (77 sentences)`,

  A2: `You are an expert ESL content creator. Simplify this VOA biography to A2 CEFR level.

A2 Level Requirements:
- Use 1,500-2,000 word vocabulary
- Create compound sentences with "and", "but", "so", "because"
- Average sentence length: 11-15 words (vs A1's 8-10 words)
- Use present perfect, past perfect, future tenses naturally
- Include more descriptive adjectives and adverbs
- More natural flow, less repetitive patterns than A1

CRITICAL RULES:
- Keep the same meaning and emotional impact
- Preserve all key events and stories
- Maintain the biographical narrative structure
- DO NOT add new content or interpretations
- Return ONLY the simplified text, no explanations`,

  B1: `You are an expert ESL content creator. Simplify this VOA biography to B1 CEFR level.

B1 Level Requirements:
- Use 2,500-3,000 word vocabulary
- Create complex sentences with subordinate clauses
- Average sentence length: 15-20 words
- Use a variety of tenses and grammatical structures
- Include idiomatic expressions and phrasal verbs
- More sophisticated vocabulary while remaining accessible

CRITICAL RULES:
- Keep the same meaning and emotional impact
- Preserve all key events and stories
- Maintain the biographical narrative structure
- DO NOT add new content or interpretations
- Return ONLY the simplified text, no explanations`
};

const prompt = levelPrompts[LEVEL] || levelPrompts.A1;

if (!levelPrompts[LEVEL]) {
  console.warn(`⚠️  Level ${LEVEL} not defined, using A1`);
}

const fullPrompt = `${prompt}

Original Text:
${originalText}`;

console.log(`🔄 Starting ${LEVEL} simplification for "Anne Lindbergh"...`);
console.log(`📊 Original text: ${originalText.length} characters`);
console.log(`📝 Original sentences: ${originalText.split(/[.!?]+\s+/).filter(s => s.trim().length > 20).length}`);
console.log('');

try {
  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
      { role: 'system', content: 'You are an expert ESL content creator specializing in CEFR level text simplification.' },
      { role: 'user', content: fullPrompt }
    ],
    temperature: 0.3,
    max_tokens: 4000
  });

  const simplifiedText = response.choices[0].message.content.trim();
  
  // Ensure output directory exists
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  fs.writeFileSync(outputPath, simplifiedText, 'utf8');

  const sentences = simplifiedText.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 0);
  const words = simplifiedText.split(/\s+/).length;

  console.log(`\n✅ ${LEVEL} SIMPLIFICATION COMPLETE!`);
  console.log(`📊 Simplified text: ${simplifiedText.length} characters`);
  console.log(`📝 Total sentences: ${sentences.length}`);
  console.log(`📖 Total words: ${words.toLocaleString()}`);
  console.log(`💾 Saved to: ${outputPath}`);
  console.log('');
  console.log('🎯 Next steps:');
  console.log('   1. Review simplified text: cat', outputPath);
  console.log('   2. Create database seed: npx tsx scripts/seed-anne-lindbergh.ts');
  console.log('   3. Generate preview: node scripts/generate-anne-lindbergh-preview.js', LEVEL);
  console.log('');

} catch (error) {
  console.error('❌ Error during simplification:', error);
  process.exit(1);
}

