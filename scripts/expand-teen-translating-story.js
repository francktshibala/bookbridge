/**
 * Expand the story to reach 20-25 minutes (2000-2500 words for A2 level)
 */

const fs = require('fs');
const path = require('path');
const { OpenAI } = require('openai');

require('dotenv').config({ path: '.env.local' });

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const STORY_ID = 'teen-translating-hospital';
const CACHE_DIR = path.join(__dirname, '..', 'cache');

async function expandStory() {
  console.log('📖 Expanding story to 20-25 minutes...');
  
  const currentStory = fs.readFileSync(path.join(CACHE_DIR, `${STORY_ID}-original.txt`), 'utf-8');
  const themes = JSON.parse(fs.readFileSync(path.join(CACHE_DIR, `${STORY_ID}-themes.json`), 'utf-8'));
  
  const prompt = `Expand this story to 2000-2500 words (20-25 minutes reading time for A2 level).

CURRENT STORY:
${currentStory}

EXPANSION GUIDELINES:
- Add more detail to each of the 7 emotional moments
- Expand dialogue and internal thoughts
- Add more scenes showing the emotional journey
- Include more specific examples of translation challenges
- Show more of the family dynamics
- Develop the confidence-building arc more fully
- Keep A2 level language (simple, clear)
- Maintain emotional impact throughout

EMOTIONAL MOMENTS TO EXPAND:
${themes.emotionalMoments.map((m, i) => `${i + 1}. ${m.moment} (${m.emotionalWeight} weight) - expand with more detail`).join('\n')}

Return the FULL expanded story (2000-2500 words), not just additions.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are expanding a story for ESL learners. Add detail and depth while keeping A2 level language. Maintain emotional impact.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
    });
    
    const expandedStory = response.choices[0].message.content.trim();
    
    // Save expanded story
    const storyFile = path.join(CACHE_DIR, `${STORY_ID}-original.txt`);
    fs.writeFileSync(storyFile, expandedStory, 'utf-8');
    
    const wordCount = expandedStory.split(/\s+/).length;
    const estimatedMinutes = Math.round(wordCount / 100);
    
    console.log(`✅ Story expanded and saved`);
    console.log(`📊 Statistics:`);
    console.log(`   - Words: ${wordCount.toLocaleString()}`);
    console.log(`   - Estimated reading time: ~${estimatedMinutes} minutes (A2 level)`);
    
    return expandedStory;
  } catch (error) {
    console.error('❌ Error expanding story:', error.message);
    throw error;
  }
}

if (require.main === module) {
  expandStory().catch(console.error);
}

module.exports = { expandStory };

