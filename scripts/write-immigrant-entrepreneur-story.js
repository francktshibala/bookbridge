/**
 * Write original narrative story based on extracted themes
 * IMPORTANT: This creates ORIGINAL text based on themes, NOT copying from sources
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

async function writeMainStory() {
  console.log('✍️  Writing original narrative story...');
  console.log('⚠️  Creating ORIGINAL text based on themes, NOT copying from sources');
  
  // Load themes
  const themesFile = path.join(CACHE_DIR, `${STORY_ID}-themes.json`);
  if (!fs.existsSync(themesFile)) {
    console.error('❌ Themes file not found. Run extract-immigrant-entrepreneur-themes.js first.');
    return;
  }
  
  const themes = JSON.parse(fs.readFileSync(themesFile, 'utf-8'));
  
  // Load background and hook for context
  const background = fs.readFileSync(path.join(CACHE_DIR, `${STORY_ID}-background.txt`), 'utf-8').trim();
  const hook = fs.readFileSync(path.join(CACHE_DIR, `${STORY_ID}-hook.txt`), 'utf-8').trim();
  
  const prompt = `You are writing an ORIGINAL narrative story for ESL learners (A2 level). 

CRITICAL RULES:
- Write ORIGINAL text based on themes, NOT copying from sources
- Use GENERIC character names (e.g., Carlos, Maria, David, Sofia) - NOT real names from sources
- Target length: 2000-2500 words (20-25 minutes reading time for A2 level)
- Use simple, clear language appropriate for A2 CEFR level
- Structure: struggle → perseverance → breakthrough → success
- Include all 10 emotional moments woven throughout the story
- Make it engaging and emotionally impactful
- Combine themes from multiple sources into ONE coherent narrative

THEMES TO USE:
${themes.themes.map(t => `- ${t}`).join('\n')}

EMOTIONAL MOMENTS TO INCLUDE (weave throughout story):
${themes.emotionalMoments.map((m, i) => `${i + 1}. ${m.moment} (${m.emotionalWeight} weight)`).join('\n')}

ESL RESONANCE MULTIPLIERS TO EMPHASIZE:
${themes.eslResonanceMultipliers.map(m => `- ${m}`).join('\n')}

STORY ARC:
- Struggle: ${themes.storyArc.struggle}
- Perseverance: ${themes.storyArc.perseverance}
- Breakthrough: ${themes.storyArc.breakthrough}
- Success: ${themes.storyArc.success}

BACKGROUND CONTEXT (set the scene):
${background}

EMOTIONAL HOOK (start with this energy):
${hook}

Write an original narrative story that:
1. Starts with the emotional hook energy (fire destroying restaurant, feeling lost)
2. Develops the emotional moments in sequence, weaving multiple stories together:
   - Fire/war destroying business
   - Depression and loss
   - Fleeing/arriving in new country
   - Language barriers and cultural adaptation
   - Taking risks to rebuild
   - Community support
   - Hard work and sacrifices
   - Breakthrough moments
   - Successful rebuilding
   - Transformation and helping others
3. Shows the emotional arc: struggle → perseverance → breakthrough → success
4. Emphasizes ESL resonance multipliers throughout
5. Combines themes from multiple sources into ONE character's journey (or multiple characters' parallel journeys)
6. Ends with realization of strength, resilience, and transformation
7. Uses original language and structure (NOT copying from sources)
8. Is appropriate for A2 level ESL learners (clear, simple, engaging)
9. Uses generic character names (NOT real names from sources)
10. Shows how immigrant entrepreneurs overcome adversity through hard work, community support, and resilience

Return ONLY the story text, no explanations.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a skilled storyteller writing original narratives for ESL learners. You NEVER copy text from sources - you create original stories based on themes and emotional moments. Your writing is clear, engaging, and appropriate for A2 level learners. You always use generic character names, never real names from sources. You can combine multiple source themes into one coherent narrative.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
    });
    
    const storyText = response.choices[0].message.content.trim();
    
    // Save story
    const storyFile = path.join(CACHE_DIR, `${STORY_ID}-original.txt`);
    fs.writeFileSync(storyFile, storyText, 'utf-8');
    
    const wordCount = storyText.split(/\s+/).length;
    const charCount = storyText.length;
    const estimatedMinutes = Math.round(wordCount / 100); // A2 reading speed ~100 words/min
    
    console.log(`✅ Story written and saved to: ${storyFile}`);
    console.log(`📊 Statistics:`);
    console.log(`   - Words: ${wordCount.toLocaleString()}`);
    console.log(`   - Characters: ${charCount.toLocaleString()}`);
    console.log(`   - Estimated reading time: ~${estimatedMinutes} minutes (A2 level)`);
    
    if (estimatedMinutes < 20 || estimatedMinutes > 25) {
      console.log(`⚠️  Warning: Target is 20-25 minutes. Current: ${estimatedMinutes} minutes`);
    }
    
    return storyText;
  } catch (error) {
    console.error('❌ Error writing story:', error.message);
    throw error;
  }
}

if (require.main === module) {
  writeMainStory().catch(console.error);
}

module.exports = { writeMainStory };

