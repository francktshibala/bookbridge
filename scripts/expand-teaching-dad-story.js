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

const STORY_ID = 'teaching-dad-to-read';
const CACHE_DIR = path.join(__dirname, '..', 'cache');

async function expandStory() {
  console.log('📖 Expanding story to meet target length...');
  
  // Load current story
  const storyFile = path.join(CACHE_DIR, `${STORY_ID}-original.txt`);
  if (!fs.existsSync(storyFile)) {
    console.error('❌ Story file not found. Run write-teaching-dad-story.js first.');
    return;
  }
  
  const currentStory = fs.readFileSync(storyFile, 'utf-8');
  const currentWordCount = currentStory.split(/\s+/).length;
  const targetWordCount = 2200; // Target for 22 minutes A2 level
  
  console.log(`📊 Current: ${currentWordCount} words (~${Math.round(currentWordCount / 100)} minutes)`);
  console.log(`🎯 Target: ${targetWordCount} words (~22 minutes)`);
  
  // Load themes for context
  const themesFile = path.join(CACHE_DIR, `${STORY_ID}-themes.json`);
  const themes = JSON.parse(fs.readFileSync(themesFile, 'utf-8'));
  
  const prompt = `You are expanding a story for ESL learners (A2 level). The current story is ${currentWordCount} words, and you need to expand it to approximately ${targetWordCount} words (target: 20-25 minutes reading time).

CRITICAL RULES:
- Keep ALL existing content - do NOT remove or change anything
- ADD detail, emotion, and scenes to expand the story
- Maintain the same structure and emotional moments
- Keep generic character names (Mia, David, etc.)
- Target: 2200 words total (approximately 22 minutes A2 reading time)

EXPANSION FOCUS:
- Add more detail to emotional moments (especially high-weight moments)
- Expand teaching scenes with more dialogue and interaction
- Add more sensory details (what they see, hear, feel)
- Include more moments of connection and relationship building
- Expand the breakthrough moment with more detail
- Add more scenes showing growing confidence
- Deepen the relationship transformation

EMOTIONAL MOMENTS TO EXPAND:
${themes.emotionalMoments.map((m, i) => `${i + 1}. ${m.moment} (${m.emotionalWeight} weight) - expand this moment`).join('\n')}

CURRENT STORY:
${currentStory}

Expand the story by adding detail, emotion, and scenes while keeping all existing content. Return ONLY the expanded story text, no explanations.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a skilled storyteller expanding narratives for ESL learners. You preserve all existing content while adding detail, emotion, and scenes to reach the target length. Your writing is clear, engaging, and appropriate for A2 level learners.',
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
    fs.writeFileSync(storyFile, expandedStory, 'utf-8');
    
    const wordCount = expandedStory.split(/\s+/).length;
    const estimatedMinutes = Math.round(wordCount / 100);
    
    console.log(`✅ Story expanded and saved`);
    console.log(`📊 New Statistics:`);
    console.log(`   - Words: ${wordCount.toLocaleString()}`);
    console.log(`   - Estimated reading time: ~${estimatedMinutes} minutes (A2 level)`);
    
    if (estimatedMinutes < 20 || estimatedMinutes > 25) {
      console.log(`⚠️  Warning: Target is 20-25 minutes. Current: ${estimatedMinutes} minutes`);
    } else {
      console.log(`✅ Target length achieved!`);
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

