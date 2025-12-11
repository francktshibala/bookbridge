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

const STORY_ID = 'disability-overcome-2';
const CACHE_DIR = path.join(__dirname, '..', 'cache');

async function writeMainStory() {
  console.log('✍️  Writing original Disability Overcome #2 narrative story at A1 level...');
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
- DO NOT use: ${allUsedNames.join(', ')} (already used in multiple stories)
- Choose names that fit the story's cultural context (mountaineering/adventure stories - use European names like Anna, Emma, Oliver, Thomas)
- Use unique names per story to avoid confusion
- NOT real names from sources (NOT Erik Weihenmayer - use generic name "Lucas" as established in the hook)
- Target length: 1,600-1,700 words (20 minutes reading time for A1 level)
- Use SIMPLE language appropriate for A1 CEFR level:
  * Short sentences (6-12 words average)
  * Simple words (common vocabulary)
  * Simple connectors: "and", "but", "when", "then"
  * Present tense and simple past tense
  * Avoid complex grammar
- Structure: diagnosis → going blind → mother's death → wrestling → rock climbing → training → Everest → transformation
- Include key emotional moments in order
- Make it engaging and emotionally impactful
- Combine themes from all sources into ONE unified story about overcoming visual impairment through mountaineering

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
- STRUGGLE: ${themes.storyArc.struggle.join(', ')}
- PERSEVERANCE: ${themes.storyArc.perseverance.join(', ')}
- BREAKTHROUGH: ${themes.storyArc.breakthrough.join(', ')}

BACKGROUND CONTEXT (set the scene):
${background}

EMOTIONAL HOOK (start with this energy):
${hook}

Write an original narrative story that:
1. Starts with the emotional hook energy (going blind at 14, feeling trapped, rock climbing revelation)
2. Develops key emotional moments in sequence:
   - Diagnosis at age 4 (knowing vision will disappear)
   - Going completely blind at age 14 (crisis, fear, isolation)
   - Mother's death at age 16 (devastating blow, double grief)
   - Wrestling breakthrough (first success, finding identity)
   - Rock climbing revelation at age 16 ("who would be crazy enough?" moment)
   - Training and building skills (mountaineering club, ice climbing)
   - Everest preparation (critics saying "you'll kill yourself", self-doubt)
   - Everest summit (impossible dream achieved)
   - Completing Seven Summits (refusing to rest on laurels)
   - Founding nonprofit (helping others, transformation)
3. Shows the emotional arc: struggle → perseverance → breakthrough → transformation
4. Emphasizes ESL resonance multipliers throughout (Universal barrier metaphor, Problem-solving focus, Teamwork emphasis, Growth mindset, Reframing disability as advantage, Helping others focus)
5. Uses key quotes/philosophy naturally:
   - "What's Within You is Stronger Than What's in Your Way"
   - "Don't make Everest the greatest thing you ever do"
   - "Going blind allowed me to start my life"
6. Ends with realization of strength, purpose, and helping others
7. Uses original language and structure (NOT copying from sources)
8. Is appropriate for A1 level ESL learners:
   - Short sentences (6-12 words)
   - Simple vocabulary
   - Clear, direct language
   - Present and simple past tense
9. Uses character name "Lucas" (as established in the hook) - DO NOT use Erik Weihenmayer or any real names from sources

Write the story now. Do NOT include markdown headings or formatting. Just write the story text directly.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a skilled storyteller writing original narratives for A1 level ESL learners. You NEVER copy text from sources - you create original stories based on themes and emotional moments. Your writing is simple, clear, and appropriate for A1 level learners (short sentences, simple words, basic grammar). You always use DIVERSE, culturally appropriate character names. For this story, use "Lucas" as the main character name (already established in the hook). DO NOT use: ${allUsedNames.join(', ')}. Never use real names from sources (never Erik Weihenmayer).`,
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
    });
    
    let storyText = response.choices[0].message.content.trim();
    
    // Remove markdown code blocks if present
    if (storyText.startsWith('```')) {
      storyText = storyText.replace(/^```[a-z]*\n?/, '').replace(/\n?```$/, '');
    }
    
    // Save story
    const storyFile = path.join(CACHE_DIR, `${STORY_ID}-A1-original.txt`);
    fs.writeFileSync(storyFile, storyText, 'utf-8');
    
    const wordCount = storyText.split(/\s+/).length;
    const charCount = storyText.length;
    const sentenceCount = storyText.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
    const avgWordsPerSentence = (wordCount / sentenceCount).toFixed(1);
    const estimatedMinutes = Math.round(wordCount / 80); // A1 reading speed ~80 words/min
    
    console.log(`✅ Story written and saved to: ${storyFile}`);
    console.log(`📊 Statistics:`);
    console.log(`   - Words: ${wordCount.toLocaleString()}`);
    console.log(`   - Characters: ${charCount.toLocaleString()}`);
    console.log(`   - Sentences: ${sentenceCount}`);
    console.log(`   - Avg words per sentence: ${avgWordsPerSentence}`);
    console.log(`   - Estimated reading time: ~${estimatedMinutes} minutes (A1 level)`);
    
    if (estimatedMinutes < 15 || estimatedMinutes > 20) {
      console.log(`⚠️  Warning: Target is 15-20 minutes. Current: ${estimatedMinutes} minutes`);
    }
    
    if (parseFloat(avgWordsPerSentence) > 12) {
      console.log(`⚠️  Warning: A1 target is 6-12 words per sentence. Current average: ${avgWordsPerSentence}`);
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

