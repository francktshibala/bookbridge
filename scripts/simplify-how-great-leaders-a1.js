import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import { config } from 'dotenv';

config({ path: '.env.local' });

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const BOOK_ID = 'how-great-leaders-inspire-action';
const LEVEL = 'A1';

async function simplifyText() {
  console.log(`📖 SIMPLIFYING: "How Great Leaders Inspire Action" by Simon Sinek`);
  console.log(`🎯 Target Level: ${LEVEL}`);
  console.log(`=`.repeat(60));

  // Load original text
  const originalPath = path.join(process.cwd(), `cache/ted-talks/${BOOK_ID}-original.txt`);
  const originalText = fs.readFileSync(originalPath, 'utf-8');

  console.log(`📝 Original text: ${originalText.length} characters`);

  const prompt = `You are an expert ESL content creator. Simplify this TED Talk transcript to A1 CEFR level.

A1 Level Requirements:
- Use 500-1,000 word vocabulary (basic everyday words only)
- Create simple, short sentences (6-12 words each on average)
- Use present simple and past simple tenses primarily
- ONE main idea per sentence (no complex clauses)
- Keep ALL the key examples and stories:
  * Golden Circle (Why, How, What)
  * Apple example (computers, challenging status quo)
  * Wright Brothers vs Langley story
  * Martin Luther King Jr. and "I have a dream"
  * Early adopters and innovation theory
- Maintain the message about "starting with why"
- Natural, clear language (not robotic)

Important:
- Preserve all main ideas and examples
- Make complex concepts simple but accurate
- Use concrete, familiar words
- Target length: 120-150 sentences
- Break long sentences into multiple short ones

Original Text:
${originalText}

Return ONLY the simplified text with proper paragraph breaks. Each sentence should be clear and simple for beginner English learners.`;

  console.log(`\n🤖 Sending to GPT-4 for simplification...`);
  console.log(`⏳ This may take 30-60 seconds...\n`);

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are an expert at simplifying English text to A1 CEFR level for ESL learners. You maintain meaning while using only basic vocabulary and simple sentence structures.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 4200
    });

    const simplifiedText = response.choices[0].message.content.trim();

    // Save to cache
    const outputPath = path.join(process.cwd(), `cache/ted-talks/${BOOK_ID}-a1-simplified.txt`);
    fs.writeFileSync(outputPath, simplifiedText, 'utf-8');

    // Calculate statistics
    const sentences = simplifiedText.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const words = simplifiedText.split(/\s+/).length;
    const avgWordsPerSentence = (words / sentences.length).toFixed(1);

    console.log(`\n✅ SIMPLIFICATION COMPLETE!`);
    console.log(`=`.repeat(60));
    console.log(`📊 Statistics:`);
    console.log(`   Sentences: ${sentences.length}`);
    console.log(`   Words: ${words}`);
    console.log(`   Characters: ${simplifiedText.length}`);
    console.log(`   Avg words/sentence: ${avgWordsPerSentence}`);
    console.log(`\n💾 Saved to: ${outputPath}`);
    console.log(`\n📝 Preview (first 200 characters):`);
    console.log(`   ${simplifiedText.substring(0, 200)}...`);

  } catch (error) {
    console.error(`\n❌ Error during simplification:`, error.message);
    throw error;
  }
}

// Run simplification
simplifyText()
  .then(() => {
    console.log(`\n🎉 Done! Ready for preview generation.`);
    process.exit(0);
  })
  .catch(error => {
    console.error(`\n💥 Fatal error:`, error);
    process.exit(1);
  });
