/**
 * Expand the A1 Community Builder story to meet target length (15-20 minutes A1 level)
 */

const fs = require('fs');
const path = require('path');
const { OpenAI } = require('openai');

require('dotenv').config({ path: '.env.local' });

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const STORY_ID = 'community-builder-1';
const CACHE_DIR = path.join(__dirname, '..', 'cache');

async function expandStory() {
  console.log('📖 Expanding A1 Community Builder story to meet target length...');
  
  // Load current story
  const storyFile = path.join(CACHE_DIR, `${STORY_ID}-A1-original.txt`);
  if (!fs.existsSync(storyFile)) {
    console.error('❌ Story file not found. Run write-community-builder-story.js first.');
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
  
  const prompt = `You are expanding a Community Builder story for ESL learners at A1 level. The current story is ${currentWordCount} words, and you need to expand it to approximately ${targetWordCount} words (target: 20 minutes reading time).

CRITICAL RULES:
- Keep ALL existing content - do NOT remove or change anything
- ADD detail, emotion, and scenes to expand the story
- Maintain A1 level language:
  * Short sentences (6-12 words average)
  * Simple words (common vocabulary)
  * Simple connectors: "and", "but", "when", "then"
  * Present tense and simple past tense
  * Avoid complex grammar
- Maintain the same structure and emotional moments
- Keep generic character names (Sofia, Carlos, Maria, etc.)
- Target: ${targetWordCount} words total (approximately 20 minutes A1 reading time)

EXPANSION FOCUS:
- Add more detail to emotional moments (especially high-weight moments):
  * Mother and daughter scene at night (expand the shame and connection)
  * Library refuge moment (expand the peace and safety feeling)
  * Neighbors mocking (expand the hurt and determination)
  * First action/planting (expand the courage and hope)
  * Community response (expand the joy of connection)
  * Transformation (expand the sense of belonging and purpose)
- Expand scenes with more sensory details (what they see, hear, feel)
- Include more moments showing the struggle and perseverance
- Add more dialogue and interactions between characters
- Expand the breakthrough moments with more detail
- Deepen the emotional journey throughout

KEY EMOTIONAL MOMENTS TO EXPAND:
${themes.emotionalMoments
  .filter(m => m.emotionalWeight === 'high')
  .map((m, i) => `${i + 1}. ${m.moment} (${m.emotionalWeight} weight) - expand this moment with more detail`)
  .join('\n')}

CURRENT STORY:
${currentStory}

Expand the story by adding detail, emotion, dialogue, and scenes while keeping all existing content. Maintain A1 level language (short sentences, simple words). Return ONLY the expanded story text, no explanations.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a skilled storyteller expanding narratives for A1 level ESL learners. You preserve all existing content while adding detail, emotion, dialogue, and scenes to reach the target length. Your writing is simple, clear, and appropriate for A1 level learners (short sentences, simple words, basic grammar).',
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
    const sentenceCount = expandedStory.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
    const avgWordsPerSentence = (wordCount / sentenceCount).toFixed(1);
    const estimatedMinutes = Math.round(wordCount / 80); // A1 reading speed ~80 words/min
    
    console.log(`✅ Story expanded and saved`);
    console.log(`📊 New Statistics:`);
    console.log(`   - Words: ${wordCount.toLocaleString()}`);
    console.log(`   - Sentences: ${sentenceCount}`);
    console.log(`   - Avg words per sentence: ${avgWordsPerSentence}`);
    console.log(`   - Estimated reading time: ~${estimatedMinutes} minutes (A1 level)`);
    
    if (estimatedMinutes < 15 || estimatedMinutes > 20) {
      console.log(`⚠️  Warning: Target is 15-20 minutes. Current: ${estimatedMinutes} minutes`);
    }
    
    if (parseFloat(avgWordsPerSentence) > 12) {
      console.log(`⚠️  Warning: A1 target is 6-12 words per sentence. Current average: ${avgWordsPerSentence}`);
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

