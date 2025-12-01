import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import { config } from 'dotenv';

config({ path: '.env.local' });

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

console.log('🎯 Simplifying "How Great Leaders Inspire Action" to A2 Level');
console.log('='.repeat(60));

// Load original text
const originalPath = path.join(process.cwd(), 'cache/ted-talks/how-great-leaders-inspire-action-original.txt');
const originalText = fs.readFileSync(originalPath, 'utf-8');

console.log(`📄 Original text: ${originalText.length} characters`);
console.log(`📝 Original words: ${originalText.split(/\s+/).length}`);

const prompt = `You are an expert ESL content creator. Simplify this TED Talk transcript to A2 CEFR level.

A2 Level Requirements:
- Use 1,000-2,000 word vocabulary (common everyday words + some less common)
- Create clear sentences (8-15 words each on average)
- Use simple past, present simple, present continuous, present perfect, going to future
- Can use basic dependent clauses (when, because, if, that) but keep them simple
- ONE or TWO ideas per sentence maximum
- Keep ALL the key examples and stories:
  * Golden Circle (Why, How, What)
  * Apple example (Think Different campaign, innovation philosophy)
  * Wright Brothers vs Samuel Langley story (detailed comparison)
  * Martin Luther King Jr. and "I have a dream" speech
  * Early adopters and innovation diffusion theory
  * TiVo example (what went wrong)
- Maintain the persuasive message about "starting with why"
- Natural, conversational language (not robotic)

Important:
- Preserve all main ideas, examples, and stories
- Make complex concepts accessible but accurate
- Use concrete examples to explain abstract ideas
- Target length: 100-130 sentences
- A2 readers can handle more complexity than A1, so don't oversimplify

Original Text:
${originalText}

Provide ONLY the simplified A2 text. No explanations, no commentary.`;

async function simplify() {
  try {
    console.log('\n🤖 Calling OpenAI GPT-4 for A2 simplification...');

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are an expert ESL content creator specializing in CEFR-aligned text simplification. You create natural, engaging simplified versions that preserve the original meaning and key examples.'
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
    const outputPath = path.join(process.cwd(), 'cache/ted-talks/how-great-leaders-inspire-action-a2-simplified.txt');
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
