import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import { config } from 'dotenv';

config({ path: '.env.local' });

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const BOOK_ID = 'always-a-family';
const LEVEL = 'B1';

async function simplifyText() {
  console.log(`📖 SIMPLIFYING: "Always a Family" by Danny & Annie Perasa`);
  console.log(`🎯 Target Level: ${LEVEL}`);
  console.log(`=`.repeat(60));

  // Load original text
  const originalPath = path.join(process.cwd(), `cache/storycorps/${BOOK_ID}-original.txt`);
  
  if (!fs.existsSync(originalPath)) {
    console.error(`❌ Original text not found at: ${originalPath}`);
    console.error(`\n💡 Please create the file with the StoryCorps transcript.`);
    process.exit(1);
  }

  const originalText = fs.readFileSync(originalPath, 'utf-8');

  console.log(`📝 Original text: ${originalText.length} characters`);
  console.log(`📝 Original words: ${originalText.split(/\s+/).length}`);

  const prompt = `You are an expert ESL content creator. Simplify this StoryCorps conversation transcript to B1 CEFR level.

B1 Level Requirements:
- Use 2,000-2,500 word vocabulary (intermediate level words)
- Create clear sentences (12-18 words each on average)
- Use common tenses: present, past, future, present perfect
- Can use some complex sentences with clear connectors (because, although, however)
- Can have multiple clauses but keep structure clear
- Keep ALL the key emotional moments and dialogue:
  * Danny reading his love note to Annie
  * Their 60+ years together
  * Annie asking "When you leave me, how am I going to live?"
  * The daily love notes routine
  * Their deep devotion and love
- Maintain the emotional impact and tenderness
- Natural, engaging language (more sophisticated than A2)
- Preserve the conversational feel with intermediate vocabulary

Important:
- Preserve all main emotional moments and dialogue
- Can use more sophisticated vocabulary than A2
- Keep the heartwarming, tearjerker quality
- Target length: 55-75 sentences (intermediate level)
- Can use present perfect and more complex grammar
- Keep dialogue natural and engaging

Original Text:
${originalText}

Return ONLY the simplified text with proper paragraph breaks. Each sentence should be clear and appropriate for intermediate English learners (B1 level).`;

  console.log(`\n🤖 Sending to GPT-4o for simplification...`);
  console.log(`⏳ This may take 30-60 seconds...\n`);

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are an expert at simplifying English text to B1 CEFR level for ESL learners. You maintain meaning and emotional impact while using intermediate vocabulary and clear sentence structures.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 3000
    });

    const simplifiedText = response.choices[0].message.content.trim();

    // Save to cache
    const cacheDir = path.join(process.cwd(), 'cache/storycorps');
    fs.mkdirSync(cacheDir, { recursive: true });
    
    const outputPath = path.join(cacheDir, `${BOOK_ID}-${LEVEL}-simplified.txt`);
    fs.writeFileSync(outputPath, simplifiedText, 'utf-8');

    // Calculate statistics
    const sentences = simplifiedText.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 0);
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
    console.log(`\n📝 Preview (first 300 characters):`);
    console.log(`   ${simplifiedText.substring(0, 300)}...`);

  } catch (error) {
    console.error(`\n❌ Error during simplification:`, error.message);
    throw error;
  }
}

simplifyText()
  .then(() => {
    console.log(`\n🎉 Done! Ready for preview generation.`);
    process.exit(0);
  })
  .catch(error => {
    console.error(`\n💥 Fatal error:`, error);
    process.exit(1);
  });

