import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import { config } from 'dotenv';

config({ path: '.env.local' });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const originalTextPath = path.join(process.cwd(), 'cache/ted-talks/danger-of-single-story-original.txt');
const outputPath = path.join(process.cwd(), 'cache/ted-talks/danger-of-single-story-a1-simplified.txt');
const originalText = fs.readFileSync(originalTextPath, 'utf8');

const prompt = `You are an expert ESL content creator. Simplify this TED Talk transcript to A1 CEFR level.

A1 Level Requirements:
- Use only 800-1,000 word vocabulary (most common English words)
- Create simple, short sentences (5-10 words each)
- Use present simple tense primarily
- Avoid complex grammar (no passive voice, conditionals, or subordinate clauses)
- Use concrete, everyday words
- Natural, clear flow
- Keep the same message and key stories

CRITICAL RULES:
- Maintain the core message about stereotypes and multiple perspectives
- Preserve Chimamanda's key personal stories (childhood books, Fide's family, American roommate, Mexican trip)
- Keep the emotional impact
- DO NOT add new content or interpretations
- Return ONLY the simplified text, no explanations

Original Text:
${originalText}`;

console.log('🔄 Starting A1 simplification for "The Danger of a Single Story"...');
console.log(`📊 Original text: ${originalText.length} characters`);

const response = await openai.chat.completions.create({
  model: 'gpt-4',
  messages: [
    { role: 'system', content: 'You are an expert ESL content creator specializing in CEFR level text simplification.' },
    { role: 'user', content: prompt }
  ],
  temperature: 0.3,
  max_tokens: 4000
});

const a1Text = response.choices[0].message.content.trim();
fs.writeFileSync(outputPath, a1Text);

const sentences = a1Text.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 0);
console.log(`\n✅ A1 SIMPLIFICATION COMPLETE!`);
console.log(`📊 Simplified text: ${a1Text.length} characters`);
console.log(`📝 Total sentences: ${sentences.length}`);
console.log(`💾 Saved to: ${outputPath}`);
