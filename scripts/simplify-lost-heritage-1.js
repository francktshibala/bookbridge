import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import { config } from 'dotenv';

config({ path: '.env.local' });

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// A1 Simplification Guidelines
const A1_GUIDELINES = `
- Use 500-1000 most common words
- Present and simple past tense only
- Natural compound sentences (6-12 words average)
- MAXIMUM 12 WORDS PER SENTENCE
- Simple connectors: "and", "but", "when" (use sparingly, only when natural)
- No cultural references or explain very simply
- Maintain exact 1:1 sentence count mapping (CRITICAL)
- Generate natural flow sentences (NOT forced micro-sentences)
- AVOID: "She is sad. She cries. She goes." (robotic micro-sentences)
- CORRECT A1: "She is sad and cries." OR "She is sad. She cries because she feels bad." (natural flow)
- Each sentence should express one complete thought
- Avoid semicolons - use periods instead
- Preserve punctuation for proper formatting
- Keep proper nouns: Yuna, Korea, Seoul, Daejeon, Hallasan, etc.
`;

// Helper function to call OpenAI API
async function callOpenAI(sentence, retryCount = 0) {
  const cleanSentence = sentence
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/'/g, "\\'")
    .replace(/\n/g, ' ')
    .replace(/\r/g, ' ')
    .replace(/\t/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const maxAttempts = 3;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 200,
      messages: [{
        role: 'user',
        content: `You are simplifying ONE sentence to A1 level. Return EXACTLY ONE sentence.

${A1_GUIDELINES}

Original sentence: "${cleanSentence}"

CRITICAL RULES:
1. Return EXACTLY ONE sentence (not two or three sentences)
2. Maximum 12 words total - if too long, use connectors to combine ideas into ONE sentence
3. Use 500-1000 most common words only
4. Use connectors: "and", "but", "when" to create natural flow within ONE sentence
5. Keep the complete meaning and emotion
6. Keep proper nouns unchanged (Yuna, Korea, Seoul, Daejeon, Hallasan, etc.)
7. Return ONLY the simplified sentence, no explanations

Simplified sentence:`
      }],
      temperature: 0.3,
    });

    const simplified = response.choices[0].message.content.trim();
    
    // Remove quotes if present
    const cleaned = simplified.replace(/^["']|["']$/g, '');
    
    // Validate it's actually one sentence
    const sentenceCount = cleaned.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
    if (sentenceCount > 1) {
      console.warn(`⚠️  Warning: Multiple sentences detected for: "${cleanSentence.substring(0, 50)}..."`);
      console.warn(`   Response: "${cleaned}"`);
    }
    
    return cleaned;
  } catch (error) {
    if (retryCount < maxAttempts) {
      console.log(`   Retrying (attempt ${retryCount + 1}/${maxAttempts})...`);
      await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
      return callOpenAI(sentence, retryCount + 1);
    }
    throw error;
  }
}

async function simplifyStory() {
  const inputFile = path.join(process.cwd(), 'cache', 'lost-heritage-1-original.txt');
  const outputFile = path.join(process.cwd(), 'cache', 'lost-heritage-1-A1-simplified.txt');

  if (!fs.existsSync(inputFile)) {
    console.error(`❌ Input file not found: ${inputFile}`);
    process.exit(1);
  }

  const originalText = fs.readFileSync(inputFile, 'utf-8');
  
  // Split into sentences (preserving punctuation)
  const sentences = originalText
    .split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 0);

  console.log(`📖 Original story: ${sentences.length} sentences`);
  console.log(`🎯 Simplifying to A1 level...\n`);

  const simplifiedSentences = [];
  let processed = 0;

  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i];
    process.stdout.write(`\r   Processing: ${i + 1}/${sentences.length}...`);
    
    try {
      const simplified = await callOpenAI(sentence);
      simplifiedSentences.push(simplified);
      processed++;
      
      // Small delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error(`\n❌ Error processing sentence ${i + 1}:`, error.message);
      console.error(`   Sentence: "${sentence.substring(0, 100)}..."`);
      // Use original sentence as fallback
      simplifiedSentences.push(sentence);
    }
  }

  console.log(`\n\n✅ Processed ${processed}/${sentences.length} sentences`);

  // Join sentences with spaces
  const simplifiedText = simplifiedSentences.join(' ');

  // Write output file
  fs.writeFileSync(outputFile, simplifiedText, 'utf-8');
  console.log(`\n💾 Saved to: ${outputFile}`);

  // Stats
  const wordCount = simplifiedText.split(/\s+/).length;
  const sentenceCount = simplifiedText.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
  const avgWordsPerSentence = (wordCount / sentenceCount).toFixed(1);
  const readingTime = Math.ceil(wordCount / 80); // A1 reading speed ~80 words/min

  console.log(`\n📊 Simplified Story Stats:`);
  console.log(`   Sentences: ${sentenceCount}`);
  console.log(`   Words: ${wordCount}`);
  console.log(`   Avg words/sentence: ${avgWordsPerSentence}`);
  console.log(`   Estimated reading time: ~${readingTime} minutes`);
}

simplifyStory()
  .then(() => {
    console.log('\n✅ Simplification complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error:', error);
    process.exit(1);
  });

