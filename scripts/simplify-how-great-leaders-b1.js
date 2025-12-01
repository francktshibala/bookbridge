import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import { config } from 'dotenv';

config({ path: '.env.local' });

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

console.log('🎯 Simplifying "How Great Leaders Inspire Action" to B1 Level');
console.log('='.repeat(60));

// Load original text
const originalPath = path.join(process.cwd(), 'cache/ted-talks/how-great-leaders-inspire-action-original.txt');
const originalText = fs.readFileSync(originalPath, 'utf-8');

console.log(`📄 Original text: ${originalText.length} characters`);
console.log(`📝 Original words: ${originalText.split(/\s+/).length}`);

const prompt = `You are an expert ESL content creator. Simplify this TED Talk transcript to B1 CEFR level.

B1 Level Requirements:
- Use 2,000-2,500 word vocabulary (intermediate vocabulary with some advanced terms)
- Create clear, flowing sentences (12-18 words each on average, maximum 25 words)
- All tenses allowed but keep clear and natural
- Complex sentences with cultural context (15-18 words average)
- More sophisticated connectors: "although", "however", "meanwhile", "therefore", "furthermore"
- Keep cultural references with brief explanations when needed
- Maintain exact 1:1 sentence count mapping (CRITICAL)
- Generate flowing complex sentences (NOT choppy short ones)
- AVOID: "She was sad. She cried. She felt bad." (simplified too much)
- CORRECT B1: "She was deeply unhappy and began to cry because she felt misunderstood by everyone around her." (natural 16 words)
- Each sentence should express one complete thought
- Preserve original style and nuance where possible
- Maintain emotional depth and persuasive quality

Important:
- Preserve ALL main ideas, examples, and stories:
  * Golden Circle (Why, How, What) - explain clearly
  * Apple example (Think Different campaign, innovation philosophy)
  * Wright Brothers vs Samuel Langley story (detailed comparison)
  * Martin Luther King Jr. and "I have a dream" speech
  * Early adopters and innovation diffusion theory
  * TiVo example (what went wrong)
- Maintain the persuasive message about "starting with why"
- Natural, engaging language (not robotic)
- B1 readers can handle more complexity than A2, so use richer vocabulary and more sophisticated structures

Original Text:
${originalText}

Provide ONLY the simplified B1 text. No explanations, no commentary.`;

async function simplify() {
  try {
    console.log('\n🤖 Calling OpenAI GPT-4 for B1 simplification...');

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are an expert ESL content creator specializing in CEFR-aligned text simplification. You create natural, engaging simplified versions that preserve the original meaning and key examples while making them accessible to intermediate learners.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 4000
    });

    const simplifiedText = completion.choices[0].message.content.trim();

    // Save simplified text
    const outputPath = path.join(process.cwd(), 'cache/ted-talks/how-great-leaders-inspire-action-b1-simplified.txt');
    fs.writeFileSync(outputPath, simplifiedText);

    // Calculate statistics
    const sentences = simplifiedText.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 0);
    const words = simplifiedText.split(/\s+/).length;
    const avgWordsPerSentence = (words / sentences.length).toFixed(1);

    console.log('\n✅ Simplification complete!');
    console.log('='.repeat(60));
    console.log(`📊 Statistics:`);
    console.log(`   • Sentences: ${sentences.length}`);
    console.log(`   • Words: ${words}`);
    console.log(`   • Avg words/sentence: ${avgWordsPerSentence}`);
    console.log(`   • Characters: ${simplifiedText.length}`);
    console.log(`\n💾 Saved to: ${outputPath}`);
    console.log('\n📝 Preview (first 200 characters):');
    console.log(`   "${simplifiedText.substring(0, 200)}..."`);

  } catch (error) {
    console.error('❌ Error during simplification:', error.message);
    throw error;
  }
}

simplify();

