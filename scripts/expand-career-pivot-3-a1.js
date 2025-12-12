/**
 * Expand Career Pivot #3 story to A1 target length (1,500-1,700 words)
 */

const fs = require('fs');
const path = require('path');
const { OpenAI } = require('openai');

require('dotenv').config({ path: '.env.local' });

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const STORY_ID = 'career-pivot-3';
const CACHE_DIR = path.join(__dirname, '..', 'cache');

async function expandStory() {
  console.log('📝 Expanding Career Pivot #3 story to A1 target length...');
  
  const storyFile = path.join(CACHE_DIR, `${STORY_ID}-original.txt`);
  if (!fs.existsSync(storyFile)) {
    console.error('❌ Story file not found. Run write-career-pivot-3-story.js first.');
    return;
  }
  
  const currentStory = fs.readFileSync(storyFile, 'utf-8').trim();
  const currentWordCount = currentStory.split(/\s+/).length;
  const targetWordCount = 1700; // Target 1,700 words for 20+ minutes
  
  console.log(`   Current: ${currentWordCount} words`);
  console.log(`   Target: ${targetWordCount} words`);
  console.log(`   Need: ${targetWordCount - currentWordCount} more words`);
  
  // Load themes for context
  const themesFile = path.join(CACHE_DIR, `${STORY_ID}-themes.json`);
  const themes = JSON.parse(fs.readFileSync(themesFile, 'utf-8'));
  
  const prompt = `You are expanding an ESL story from ${currentWordCount} words to ${targetWordCount} words (A1 level).

CRITICAL RULES:
- Keep A1 level: short sentences (6-12 words), simple words, clear language
- EXPAND emotional moments with more detail and feeling
- ADD more dialogue and internal thoughts
- EXPAND descriptions of struggles, fears, and breakthroughs
- ADD more scenes showing the learning journey
- Keep the same story structure and character name (Elena)
- Maintain 1:1 sentence mapping (same number of sentences, just expand each)
- Do NOT add new major plot points, just expand existing ones

CURRENT STORY:
${currentStory}

THEMES TO EXPAND:
${themes.themes.join(', ')}

EMOTIONAL MOMENTS TO EXPAND WITH MORE DETAIL:
${themes.emotionalMoments
  .filter(m => m.emotionalWeight === 'high')
  .map(m => `- ${m.moment}: ${m.description}`)
  .join('\n')}

Expand the story by:
1. Adding more emotional detail to each moment
2. Expanding dialogue and internal thoughts
3. Adding more description of feelings and challenges
4. Expanding the bootcamp experience with more detail
5. Adding more about the financial struggle and fear
6. Expanding the identity deconstruction moment
7. Adding more detail about the breakthrough and transformation

Target: ${targetWordCount} words total
Keep A1 level: short sentences, simple words, clear language
Return ONLY the expanded story text, no explanations.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are expanding an ESL story while maintaining A1 level simplicity. Keep sentences short, words simple, and language clear.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
    });
    
    const expandedStory = response.choices[0].message.content.trim();
    
    // Remove markdown
    const cleanStory = expandedStory
      .replace(/^#+\s+/gm, '')
      .replace(/^\*\*/gm, '')
      .replace(/\*\*$/gm, '')
      .trim();
    
    const finalWordCount = cleanStory.split(/\s+/).length;
    const sentenceCount = cleanStory.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
    
    // Save expanded story
    fs.writeFileSync(storyFile, cleanStory, 'utf-8');
    
    console.log(`✅ Story expanded and saved`);
    console.log(`📊 Final Statistics:`);
    console.log(`   - Words: ${finalWordCount} (target: ${targetWordCount})`);
    console.log(`   - Sentences: ${sentenceCount}`);
    console.log(`   - Avg words per sentence: ${(finalWordCount / sentenceCount).toFixed(1)}`);
    
    return cleanStory;
  } catch (error) {
    console.error('❌ Error expanding story:', error.message);
    throw error;
  }
}

if (require.main === module) {
  expandStory().catch(console.error);
}

module.exports = { expandStory };

