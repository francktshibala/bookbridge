/**
 * Write original narrative story based on extracted themes
 * IMPORTANT: This creates ORIGINAL text based on themes, NOT copying from sources
 * TARGET: A1 level directly (simpler language, shorter sentences)
 * VOICE: Jane (RILOU7YmBhvwJGDGjNmP)
 */

const fs = require('fs');
const path = require('path');
const { OpenAI } = require('openai');

require('dotenv').config({ path: '.env.local' });

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const STORY_ID = 'refugee-journey-2';
const CACHE_DIR = path.join(__dirname, '..', 'cache');

async function writeMainStory() {
  console.log('✍️  Writing original Refugee Journey #2 narrative story at A1 level...');
  console.log('⚠️  Creating ORIGINAL text based on themes, NOT copying from sources');
  console.log('🗣️  Voice: Jane (RILOU7YmBhvwJGDGjNmP)');
  
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
  
  const prompt = `You are writing an ORIGINAL narrative story for ESL learners at A1 level.

CRITICAL RULES:
- Write ORIGINAL text based on themes, NOT copying from sources
- Use DIVERSE, CULTURALLY APPROPRIATE character names - AVOID repeating names from previous stories
- DO NOT use: ${usedNames.join(', ')} (already used in multiple stories)
- Choose names that fit the story's cultural context (refugee journey stories often involve diverse origins)
- Use unique names per story to avoid confusion
- NOT real names from sources (NOT Solomon, NOT Maria Nyamal, NOT Kapungu, NOT Jonathan/Christine - use generic names)
- Target length: 1,600-1,700 words (20 minutes reading time for A1 level)
- Use SIMPLE language appropriate for A1 CEFR level:
  * Short sentences (6-12 words average)
  * Simple words (common vocabulary)
  * Simple connectors: "and", "but", "when", "then"
  * Present tense and simple past tense
  * Avoid complex grammar
- Structure: separation/struggle → perseverance → breakthrough → reunion/transformation
- Include key emotional moments in order
- Make it engaging and emotionally impactful
- Combine themes from all sources into ONE unified story about refugee journeys

THEMES TO USE:
${themes.themes.map(t => `- ${t}`).join('\n')}

KEY EMOTIONAL MOMENTS TO INCLUDE (prioritize high weight):
${themes.emotionalMoments
  .filter(m => m.emotionalWeight === 'high')
  .map((m, i) => `${i + 1}. ${m.moment} (${m.emotionalWeight} weight, source ${m.source})`)
  .join('\n')}

ESL RESONANCE MULTIPLIERS TO EMPHASIZE:
${themes.eslResonanceMultipliers.map(m => `- ${m}`).join('\n')}

STORY ARC:
- STRUGGLE: ${themes.storyArc.struggle.join(', ')}
- PERSEVERANCE: ${themes.storyArc.perseverance.join(', ')}
- BREAKTHROUGH: ${themes.storyArc.breakthrough.join(', ')}

BACKGROUND CONTEXT (set the scene):
${background}

EMOTIONAL HOOK (start with this energy):
${hook}

Write an original narrative story that:
1. Starts with the emotional hook energy (separation, struggle, survival)
2. Develops key emotional moments in sequence:
   - Initial separation/struggle (family separated, war, persecution, loss)
   - Long wait/perseverance (years apart, video calls, legal battles, survival)
   - Breakthrough moments (reunion approval, finding family alive, education transformation, advocacy)
   - Transformation (reunion, new life, belonging, helping others)
3. Shows the emotional arc: separation/struggle → perseverance → breakthrough → reunion/transformation
4. Emphasizes ESL resonance multipliers throughout (Building New Life, Belonging & Identity, Connection Across Differences, Overcoming "Not Good Enough", Persistence, First-Time Courage, Communication & Language Barriers)
5. Combines elements from all source themes:
   - Family reunification after long separation (Source 1)
   - Education transformation (refugee becomes teacher) (Source 2)
   - Advocacy leadership (helping others) (Source 3)
   - Survival miracle (believed dead → reunion) (Source 4)
6. Ends with realization of hope, belonging, and new purpose
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

if (require.main === module) {
  writeMainStory().catch(console.error);
}

module.exports = { writeMainStory };

