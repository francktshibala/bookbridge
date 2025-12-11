/**
 * Expand Disability Overcome #2 story to meet target length (1,600-1,700 words, ~20 minutes)
 */

const fs = require('fs');
const path = require('path');
const { OpenAI } = require('openai');

require('dotenv').config({ path: '.env.local' });

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const STORY_ID = 'disability-overcome-2';
const CACHE_DIR = path.join(__dirname, '..', 'cache');

async function expandStory() {
  console.log('📖 Expanding A1 Disability Overcome #2 story to meet target length...');
  
  const storyFile = path.join(CACHE_DIR, `${STORY_ID}-A1-original.txt`);
  if (!fs.existsSync(storyFile)) {
    console.error('❌ Story file not found. Run write-disability-overcome-2-story.js first.');
    return;
  }
  
  const currentStory = fs.readFileSync(storyFile, 'utf-8');
  const currentWordCount = currentStory.split(/\s+/).length;
  const targetWordCount = 1650; // Target for 20 minutes A1 level (80 words/min)
  
  console.log(`📊 Current: ${currentWordCount} words (~${Math.round(currentWordCount / 80)} minutes)`);
  console.log(`🎯 Target: ${targetWordCount} words (~20 minutes)`);
  
  // Load themes for context
  const themesFile = path.join(CACHE_DIR, `${STORY_ID}-themes.json`);
  const themes = JSON.parse(fs.readFileSync(themesFile, 'utf-8'));
  
  const prompt = `You are expanding a story for ESL learners at A1 level. The current story is ${currentWordCount} words, and you need to expand it to approximately ${targetWordCount} words (target: 15-20 minutes reading time).

CRITICAL RULES:
- Keep ALL existing content - do NOT remove anything
- Add MORE detail, emotion, and scenes to reach target length
- Maintain A1 level language:
  * Short sentences (6-12 words average)
  * Simple words (common vocabulary)
  * Simple connectors: "and", "but", "when", "then"
  * Present tense and simple past tense
- Add more emotional moments and scenes
- Expand key scenes with more detail
- Add more dialogue and internal thoughts
- Show more of the struggle, persistence, and breakthrough moments
- Use character name "Lucas" (already established) - NOT real names from sources

THEMES TO EMPHASIZE:
${themes.themes.map(t => `- ${t}`).join('\n')}

KEY EMOTIONAL MOMENTS TO EXPAND:
${themes.emotionalMoments
  .filter(m => m.emotionalWeight === 'high')
  .map((m, i) => `${i + 1}. ${m.moment}`)
  .join('\n')}

ESL RESONANCE MULTIPLIERS TO EMPHASIZE:
${themes.eslResonanceMultipliers.map(m => `- ${m}`).join('\n')}

CURRENT STORY:
${currentStory}

Expand the story by:
1. Adding more detail to existing scenes (what did Lucas feel? what did he think? what challenges did he face?)
2. Adding more scenes showing the struggle of going blind, isolation, and fear
3. Expanding the rock climbing revelation moment with more detail
4. Adding more scenes showing training, practice, and building skills
5. Expanding the Everest preparation and summit with more detail
6. Adding more scenes showing teamwork and support from others
7. Including more emotional moments and internal thoughts
8. Adding more dialogue between Lucas and his father, teammates, critics
9. Showing more of the adaptation process (how he learned to climb without sight)
10. Expanding the transformation and helping others moments

Return ONLY the expanded story text, no explanations.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a skilled storyteller expanding narratives for A1 level ESL learners. You maintain simple, clear language appropriate for A1 level (short sentences, simple words, basic grammar). You always use character name "Lucas" (already established), never real names from sources.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
    });
    
    let expandedStory = response.choices[0].message.content.trim();
    
    // Remove markdown code blocks if present
    if (expandedStory.startsWith('```')) {
      expandedStory = expandedStory.replace(/^```[a-z]*\n?/, '').replace(/\n?```$/, '');
    }
    
    // Save expanded story
    fs.writeFileSync(storyFile, expandedStory, 'utf-8');
    
    const wordCount = expandedStory.split(/\s+/).length;
    const sentenceCount = expandedStory.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
    const avgWordsPerSentence = (wordCount / sentenceCount).toFixed(1);
    const estimatedMinutes = Math.round(wordCount / 80);
    
    console.log(`✅ Story expanded and saved to: ${storyFile}`);
    console.log(`📊 New Statistics:`);
    console.log(`   - Words: ${wordCount.toLocaleString()} (was ${currentWordCount})`);
    console.log(`   - Sentences: ${sentenceCount}`);
    console.log(`   - Avg words per sentence: ${avgWordsPerSentence}`);
    console.log(`   - Estimated reading time: ~${estimatedMinutes} minutes (A1 level)`);
    
    if (estimatedMinutes < 15 || estimatedMinutes > 20) {
      console.log(`⚠️  Warning: Target is 15-20 minutes. Current: ${estimatedMinutes} minutes`);
      if (estimatedMinutes < 15) {
        console.log(`   Consider running this script again to expand further.`);
      }
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

