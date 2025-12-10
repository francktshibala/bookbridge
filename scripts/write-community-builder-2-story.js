/**
 * Write original Community Builder #2 (Luma Mufleh) narrative story
 * IMPORTANT: Creates ORIGINAL text based on themes, NOT copying from sources
 */

const fs = require('fs');
const path = require('path');
const { OpenAI } = require('openai');

require('dotenv').config({ path: '.env.local' });

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const STORY_ID = 'community-builder-2';
const CACHE_DIR = path.join(__dirname, '..', 'cache');

async function writeMainStory() {
  console.log('✍️  Writing original Community Builder #2 narrative story at A1 level...');
  console.log('⚠️  Creating ORIGINAL text based on themes, NOT copying from sources');
  console.log('🗣️  Voice: Daniel (onwK4e9ZLuTAKqWW03F9)');
  
  // Load themes
  const themesFile = path.join(CACHE_DIR, `${STORY_ID}-themes.json`);
  if (!fs.existsSync(themesFile)) {
    console.error('❌ Themes file not found. Run theme extraction first.');
    return;
  }
  
  const themes = JSON.parse(fs.readFileSync(themesFile, 'utf-8'));
  
  // Load background and hook for context
  const background = fs.readFileSync(path.join(CACHE_DIR, `${STORY_ID}-background.txt`), 'utf-8').trim();
  const hook = fs.readFileSync(path.join(CACHE_DIR, `${STORY_ID}-hook.txt`), 'utf-8').trim();
  
  // Load character names tracker
  const namesTrackerFile = path.join(__dirname, '..', 'docs', 'implementation', 'character-names-tracker.json');
  const namesTracker = JSON.parse(fs.readFileSync(namesTrackerFile, 'utf-8'));
  const usedNames = Object.keys(namesTracker.usedNames || {});
  // Also avoid names from refugee-journey-2 (Amina, Rami, Solomon, Helen)
  const additionalUsedNames = ['Amina', 'Rami', 'Solomon', 'Helen'];
  const allUsedNames = [...usedNames, ...additionalUsedNames];
  
  const prompt = `You are writing an ORIGINAL narrative story for ESL learners at A1 level.

CRITICAL RULES:
- Write ORIGINAL text based on themes, NOT copying from sources
- Use DIVERSE, CULTURALLY APPROPRIATE character names - AVOID repeating names from previous stories
- DO NOT use: ${allUsedNames.join(', ')} (already used in previous stories)
- PROTAGONIST NAME: Use "Layla" (Middle Eastern, culturally appropriate for this story)
- Supporting characters: Use diverse names from different cultures (refugee children from various countries)
- NOT real names from sources (NOT Luma Mufleh, NOT Fugees - use generic names)
- Target length: 1,600-1,700 words (20 minutes reading time for A1 level)
- Use SIMPLE language appropriate for A1 CEFR level:
  * Short sentences (6-12 words average)
  * Simple words (common vocabulary)
  * Simple connectors: "and", "but", "when", "then"
  * Present tense and simple past tense
  * Avoid complex grammar
- Structure: privileged beginning → exile → drifting → wrong turn → discovery → transformation
- Include key emotional moments in order
- Make it engaging and emotionally impactful
- Combine themes from research into ONE unified story about community building through refugee support

THEMES TO USE:
${themes.themes.map(t => `- ${t}`).join('\n')}

KEY EMOTIONAL MOMENTS TO INCLUDE (prioritize high weight):
${themes.emotionalMoments
  .filter(m => m.emotionalWeight === 'high')
  .map((m, i) => `${i + 1}. ${m.moment} (${m.emotionalWeight} weight)`)
  .join('\n')}

ESL RESONANCE MULTIPLIERS TO EMPHASIZE:
${themes.eslResonanceMultipliers.map(m => `- ${m}`).join('\n')}

STORY ARC:
- STRUGGLE: ${themes.storyArc.struggle}
- PERSEVERANCE: ${themes.storyArc.perseverance}
- BREAKTHROUGH: ${themes.storyArc.breakthrough}

BACKGROUND CONTEXT (set the scene):
${background}

EMOTIONAL HOOK (start with this energy):
${hook}

Write an original narrative story that:
1. Starts with the emotional hook energy (privileged beginning → exile → drifting → wrong turn)
2. Develops key emotional moments in sequence:
   - Privileged beginning (Jordan childhood, soccer as lifeline, grandmother's refugee story)
   - Exile (coming out, disowned by family, asylum application, fear)
   - Drifting (years of small jobs, isolated Ramadan fasts, searching for purpose)
   - Wrong turn (2004 parking lot, barefoot children, deflated ball, life-changing encounter)
   - Discovery (chopped fingers goalie, can't read discovery, educational failures, debt trap)
   - Transformation (school founding, first graduation, Ramadan with community, mutual healing)
3. Shows the emotional arc: privileged → exile → drifting → wrong turn → discovery → transformation
4. Emphasizes ESL resonance multipliers throughout (Building New Life, Belonging & Identity, Connection Across Differences, Overcoming "Not Good Enough", Persistence, First-Time Courage)
5. Includes key elements:
   - Soccer as universal language (brings warring factions together)
   - Educational justice (refugee children can't read but promoted anyway)
   - Mutual healing (helper needed help too - "Fugees gave me belonging")
   - Community building (from soccer team to school network)
6. Ends with realization of belonging, purpose, and community transformation
7. Uses original language and structure (NOT copying from sources)
8. Is appropriate for A1 level ESL learners:
   - Simple vocabulary
   - Short sentences
   - Clear emotional beats
   - Relatable struggles and triumphs

Write the story now. Do NOT include markdown headings or formatting. Just write the story text directly.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a storyteller writing original narratives for ESL learners. You create original text based on themes, never copying from sources. You use simple language appropriate for A1 level learners.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.8,
    });

    const storyText = response.choices[0].message.content.trim();
    
    // Remove any markdown headings if present
    const cleanedStory = storyText
      .replace(/^#+\s+.+$/gm, '') // Remove markdown headings
      .replace(/^\*\*.+\*\*$/gm, '') // Remove markdown bold headings
      .trim();

    // Save story
    const storyFile = path.join(CACHE_DIR, `${STORY_ID}-A1-original.txt`);
    fs.writeFileSync(storyFile, cleanedStory, 'utf-8');

    // Count words and sentences
    const wordCount = cleanedStory.split(/\s+/).length;
    const sentenceCount = cleanedStory.split(/[.!?]+/).filter(s => s.trim().length > 0).length;

    console.log(`✅ Story written and saved to: ${storyFile}`);
    console.log(`📊 Stats:`);
    console.log(`   - Words: ${wordCount}`);
    console.log(`   - Sentences: ${sentenceCount}`);
    console.log(`   - Target: 1,600-1,700 words`);

    if (wordCount < 1500) {
      console.log(`⚠️  Story is shorter than target. Consider expanding.`);
    } else if (wordCount > 1800) {
      console.log(`⚠️  Story is longer than target. May need trimming.`);
    }

    return cleanedStory;
  } catch (error) {
    console.error('❌ Error writing story:', error.message);
    throw error;
  }
}

// Run story writing
writeMainStory().catch(console.error);

