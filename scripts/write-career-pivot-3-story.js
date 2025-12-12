/**
 * Write original narrative story based on extracted themes
 * IMPORTANT: This creates ORIGINAL text based on themes, NOT copying from sources
 * TARGET: A1 level directly (simpler language, shorter sentences)
 * VOICE: Daniel (onwK4e9ZLuTAKqWW03F9)
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

async function writeMainStory() {
  console.log('✍️  Writing original Career Pivot #3 narrative story at A1 level...');
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
  const allUsedNames = [...usedNames];
  
  const prompt = `You are writing an ORIGINAL narrative story for ESL learners at A1 level.

CRITICAL RULES:
- Write ORIGINAL text based on themes, NOT copying from sources
- Use DIVERSE, CULTURALLY APPROPRIATE character names - AVOID repeating names from previous stories
- DO NOT use: ${allUsedNames.join(', ')} (already used in multiple stories)
- PROTAGONIST NAME: Use "Elena" (Hispanic origin, culturally appropriate for teacher-to-engineer story)
- Supporting characters: Use diverse names (colleagues, friends, mentors)
- NOT real names from sources (NOT Krista Moroder, NOT any real names - use generic names)
- Target length: 1,600-1,700 words (20 minutes reading time for A1 level)
- Use SIMPLE language appropriate for A1 CEFR level:
  * Short sentences (6-12 words average)
  * Simple words (common vocabulary)
  * Simple connectors: "and", "but", "when", "then"
  * Present tense and simple past tense
  * Avoid complex grammar
- Structure: comfortable career → panel moment → revelation → desire → risk → perseverance → transformation
- Include key emotional moments in order
- Make it engaging and emotionally impactful
- Combine themes from sources into ONE unified story about professional transformation

THEMES TO USE:
${themes.themes.map(t => `- ${t}`).join('\n')}

KEY EMOTIONAL MOMENTS TO INCLUDE (prioritize high weight):
${themes.emotionalMoments
  .filter(m => m.emotionalWeight === 'high')
  .map((m, i) => `${i + 1}. ${m.moment}: ${m.description} (${m.emotionalWeight} weight)`)
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
1. Starts with the emotional hook energy (panel moment, blanking, revelation)
2. Develops key emotional moments in sequence:
   - Panel moment (Elena on stage, blanking on question)
   - The revelation (engineering director's answer shatters assumptions)
   - "I wanted her superpower" (desire awakened)
   - The vow (determination to learn coding)
   - Financial fear ($20,000 bootcamp, no income for months)
   - Identity struggle (who am I if not a teacher?)
   - Breakthrough (graduation, first job offer, transformation)
3. Shows the emotional arc: comfortable career → panel moment → revelation → desire → risk → perseverance → transformation
4. Emphasizes ESL resonance multipliers throughout (Learning & Education Journeys, Overcoming "Not Good Enough", First-Time Courage, Building New Life, Persistence Despite Setbacks)
5. Includes key elements:
   - Wrong assumptions about engineers (back room vs front room)
   - One conversation that changes everything
   - Financial risk as barrier
   - Identity deconstruction and reconstruction
   - Learning journey (bootcamp, intensive study)
   - Success in new field
6. Ends with realization of transformation, new identity, and fulfillment
7. Uses original language and structure (NOT copying from sources)
8. Is appropriate for A1 level ESL learners:
   - Short sentences (6-12 words)
   - Simple vocabulary
   - Clear, direct language
   - Present and simple past tense
9. Uses generic character name "Elena" (NOT Krista Moroder or any real names)

Write the story now. Do NOT include markdown headings or formatting. Just write the story text directly.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a creative writer crafting original ESL stories. You NEVER copy text from sources - only use themes and emotional beats to create original narratives.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
    });
    
    const storyText = response.choices[0].message.content.trim();
    
    // Remove any markdown formatting
    const cleanStory = storyText
      .replace(/^#+\s+/gm, '')
      .replace(/^\*\*/gm, '')
      .replace(/\*\*$/gm, '')
      .replace(/^##+\s+/gm, '')
      .trim();
    
    const storyFile = path.join(CACHE_DIR, `${STORY_ID}-original.txt`);
    fs.writeFileSync(storyFile, cleanStory, 'utf-8');
    
    const wordCount = cleanStory.split(/\s+/).length;
    const sentenceCount = cleanStory.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
    
    console.log(`✅ Story written and saved to: ${storyFile}`);
    console.log(`📊 Statistics:`);
    console.log(`   - Words: ${wordCount}`);
    console.log(`   - Sentences: ${sentenceCount}`);
    console.log(`   - Avg words per sentence: ${(wordCount / sentenceCount).toFixed(1)}`);
    
    return cleanStory;
  } catch (error) {
    console.error('❌ Error writing story:', error.message);
    throw error;
  }
}

if (require.main === module) {
  writeMainStory().catch(console.error);
}

module.exports = { writeMainStory };

