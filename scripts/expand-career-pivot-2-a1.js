/**
 * Expand the A1 Career Pivot #2 story to meet target length (15-20 minutes A1 level)
 */

const fs = require('fs');
const path = require('path');
const { OpenAI } = require('openai');

require('dotenv').config({ path: '.env.local' });

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const STORY_ID = 'career-pivot-2';
const CACHE_DIR = path.join(__dirname, '..', 'cache');

async function expandStory() {
  console.log('📖 Expanding A1 Career Pivot #2 story to meet target length...');

  // Load current story
  const storyFile = path.join(CACHE_DIR, `${STORY_ID}-A1-original.txt`);
  if (!fs.existsSync(storyFile)) {
    console.error('❌ Story file not found. Run write-career-pivot-2-story.js first.');
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

  const prompt = `You are expanding a Career Pivot story #2 for ESL learners at A1 level. The current story is ${currentWordCount} words, and you need to expand it to approximately ${targetWordCount} words (target: 20 minutes reading time).

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
- Keep generic character names (already used in story)
- Target: ${targetWordCount} words total (approximately 20 minutes A1 reading time)

EXPANSION FOCUS:
- Add more detail to emotional moments (especially high-weight moments):
  * Unexpected job loss shock (fired, laid off, escorted out)
  * Financial crisis (food stamps, shopping cart nightmare, bills mounting)
  * Identity crisis (who am I without my job?, feeling like a failure)
  * Isolation and struggle (basement, alone, pulling away from friends)
  * Breakthrough moments (finding counselor, support from others, new opportunity)
  * Transformation (new career path, service-oriented work, finding purpose)
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
          content: 'You are a storyteller expanding narratives for ESL learners. You add detail and emotion while maintaining A1 level language (short sentences, simple words).',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
    });

    const expandedStory = response.choices[0].message.content.trim();
    
    // Remove any markdown headings if present
    const cleanedStory = expandedStory
      .replace(/^#+\s+.+$/gm, '') // Remove markdown headings
      .replace(/^\*\*.+\*\*$/gm, '') // Remove markdown bold headings
      .trim();

    // Save expanded story
    fs.writeFileSync(storyFile, cleanedStory, 'utf-8');

    // Count words and sentences
    const wordCount = cleanedStory.split(/\s+/).length;
    const sentenceCount = cleanedStory.split(/[.!?]+/).filter(s => s.trim().length > 0).length;

    console.log(`✅ Story expanded and saved to: ${storyFile}`);
    console.log(`📊 Stats:`);
    console.log(`   - Words: ${wordCount} (target: ${targetWordCount})`);
    console.log(`   - Sentences: ${sentenceCount}`);
    console.log(`   - Reading time: ~${Math.round(wordCount / 80)} minutes`);

    if (wordCount < 1500) {
      console.log(`⚠️  Story is still shorter than target. Consider expanding again.`);
    } else if (wordCount > 1800) {
      console.log(`⚠️  Story is longer than target. May need trimming.`);
    } else {
      console.log(`✅ Story length is within target range!`);
    }

    return cleanedStory;
  } catch (error) {
    console.error('❌ Error expanding story:', error.message);
    throw error;
  }
}

if (require.main === module) {
  expandStory().catch(console.error);
}

module.exports = { expandStory };

