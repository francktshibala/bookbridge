/**
 * Expand the main story to meet target length (20-25 minutes A2 level)
 */

const fs = require('fs');
const path = require('path');
const { OpenAI } = require('openai');

require('dotenv').config({ path: '.env.local' });

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const STORY_ID = 'immigrant-entrepreneur';
const CACHE_DIR = path.join(__dirname, '..', 'cache');

async function expandStory() {
  console.log('📖 Expanding story to meet 20-25 minute target...');
  
  const inputFile = path.join(CACHE_DIR, `${STORY_ID}-original.txt`);
  if (!fs.existsSync(inputFile)) {
    console.error('❌ Original story file not found. Run write-immigrant-entrepreneur-story.js first.');
    return;
  }
  
  const currentStory = fs.readFileSync(inputFile, 'utf-8');
  const currentWordCount = currentStory.split(/\s+/).length;
  const targetWordCount = 2200; // Target for A2 level (approx 22 minutes at 100 words/min)
  const estimatedMinutes = Math.round(currentWordCount / 100);
  
  console.log(`📊 Current: ${currentWordCount} words (~${estimatedMinutes} min)`);
  console.log(`🎯 Target: ${targetWordCount} words (~${Math.round(targetWordCount / 100)} min)`);
  
  if (currentWordCount >= targetWordCount) {
    console.log('✅ Story already meets or exceeds target length. No expansion needed.');
    return currentStory;
  }
  
  // Load themes for context
  const themesFile = path.join(CACHE_DIR, `${STORY_ID}-themes.json`);
  const themes = fs.existsSync(themesFile) ? JSON.parse(fs.readFileSync(themesFile, 'utf-8')) : null;
  
  const prompt = `Expand the following story to approximately ${targetWordCount} words (around ${Math.round(targetWordCount / 100)} minutes reading time for A2 level).

CURRENT STORY:
${currentStory}

EXPANSION GUIDELINES:
- Add more descriptive detail to scenes and character actions
- Expand on emotional reactions and thoughts of characters
- Develop the existing emotional moments more fully
- Add more dialogue and interactions
- Include more examples of struggles, perseverance, and breakthroughs
- Maintain A2 level language (clear, simple, engaging)
- Keep the same structure and emotional arc
- Use generic character names (NOT real names from sources)
- Ensure the story maintains its emotional impact and coherent narrative flow
- Return the FULL expanded story, not just the additions

${themes ? `THEMES TO EMPHASIZE:\n${themes.themes.map(t => `- ${t}`).join('\n')}\n\nEMOTIONAL MOMENTS TO EXPAND:\n${themes.emotionalMoments.map((m, i) => `${i + 1}. ${m.moment}`).join('\n')}` : ''}

Return ONLY the expanded story text, no explanations.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a skilled storyteller expanding an A2 level story for ESL learners. Add detail and depth while maintaining A2 level language. Ensure emotional impact and narrative coherence. The expanded story must reach the target word count. Use generic character names.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
    });

    const expandedStory = response.choices[0].message.content.trim();

    fs.writeFileSync(inputFile, expandedStory, 'utf-8');

    const newWordCount = expandedStory.split(/\s+/).length;
    const newEstimatedMinutes = Math.round(newWordCount / 100);

    console.log(`✅ Expanded!`);
    console.log(`📊 New: ${newWordCount} words (~${newEstimatedMinutes} min)`);

    if (newEstimatedMinutes < 20) {
      console.log(`⚠️  WARNING: Story is ${newEstimatedMinutes} minutes, target is at least 20 minutes.`);
      console.log(`💡 Consider running this script again to expand further.`);
    } else {
      console.log(`✅ Target met: ${newEstimatedMinutes} minutes (≥20 minutes)`);
    }

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

