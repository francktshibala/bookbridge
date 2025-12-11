/**
 * Expand A1 simplified text to meet 20-minute target
 */

const fs = require('fs');
const path = require('path');
const { OpenAI } = require('openai');

require('dotenv').config({ path: '.env.local' });

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const STORY_ID = 'grief-to-purpose-1';
const CACHE_DIR = path.join(__dirname, '..', 'cache');

async function expandA1Text() {
  console.log('📖 Expanding A1 simplified text to meet 20-minute target...');
  
  const inputFile = path.join(CACHE_DIR, `${STORY_ID}-A1-simplified.txt`);
  if (!fs.existsSync(inputFile)) {
    console.error('❌ A1 simplified file not found');
    return;
  }
  
  const text = fs.readFileSync(inputFile, 'utf-8');
  const currentWords = text.split(/\s+/).length;
  const targetWords = 1600; // Target for 20 minutes (80 words/min)
  
  console.log(`📊 Current: ${currentWords} words (~${Math.round(currentWords / 80)} min)`);
  console.log(`🎯 Target: ${targetWords} words (~20 min)`);
  
  const prompt = `Expand this A1 simplified story to approximately ${targetWords} words (target: 20 minutes reading time).

CRITICAL RULES:
- Keep ALL existing content - do NOT remove anything
- ADD detail and emotion while maintaining A1 level (max 12 words per sentence)
- Use simple vocabulary (500-1000 most common words)
- Add more detail to emotional moments (the phone call, choosing clothes, finding the notebook, helping children)
- Expand dialogue and interactions
- Add more scenes showing Anna's grief and transformation
- Keep natural A1 flow
- Add new sentences to expand, don't merge existing ones
- Keep proper nouns: Anna, Ethan, Ethan's Connection, Maya

CURRENT STORY (${currentWords} words):
${text}

Expand by adding detail and new sentences while keeping all existing content. Return ONLY the expanded A1 text.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are expanding A1 level text for ESL learners. Maintain A1 constraints (max 12 words/sentence, simple vocabulary) while adding detail and emotion. Keep proper nouns unchanged (Anna, Ethan, Ethan\'s Connection, Maya).',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
    });
    
    let expanded = response.choices[0].message.content.trim();
    
    // Remove markdown code blocks if present
    if (expanded.startsWith('```')) {
      expanded = expanded.replace(/^```[a-z]*\n?/, '').replace(/\n?```$/, '');
    }
    
    fs.writeFileSync(inputFile, expanded, 'utf-8');
    
    const newWords = expanded.split(/\s+/).length;
    const newMinutes = Math.round(newWords / 80);
    
    console.log(`✅ Expanded!`);
    console.log(`📊 New: ${newWords} words (~${newMinutes} min)`);
    
    if (newMinutes >= 20) {
      console.log(`✅ Target met: ${newMinutes} minutes (≥20 minutes)`);
    } else {
      console.log(`⚠️  Still below target: ${newMinutes} minutes`);
      console.log(`   Consider running this script again to expand further.`);
    }
    
    return expanded;
  } catch (error) {
    console.error('❌ Error expanding:', error.message);
    throw error;
  }
}

if (require.main === module) {
  expandA1Text().catch(console.error);
}

module.exports = { expandA1Text };

