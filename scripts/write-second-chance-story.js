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

const STORY_ID = 'second-chance-1';
const CACHE_DIR = path.join(__dirname, '..', 'cache');

async function writeMainStory() {
  console.log('✍️  Writing original Second Chance narrative story at A1 level...');
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
  
  const prompt = `You are writing an ORIGINAL narrative story for ESL learners at A1 level.

CRITICAL RULES:
- Write ORIGINAL text based on themes, NOT copying from sources
- Use GENERIC character names (e.g., Maria, David, Sofia) - NOT real names from sources (NOT Brett Buskirk, NOT Sean Pica, NOT any real names)
- Target length: 1,600-1,700 words (20 minutes reading time for A1 level)
- Use SIMPLE language appropriate for A1 CEFR level:
  * Short sentences (6-12 words average)
  * Simple words (common vocabulary)
  * Simple connectors: "and", "but", "when", "then"
  * Present tense and simple past tense
  * Avoid complex grammar
- Structure: despair/rock bottom → disbelief → determination → breakthrough → transformation → redemption
- Include key emotional moments in order
- Make it engaging and emotionally impactful
- Combine themes from all sources into ONE unified story about second chances

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
1. Starts with the emotional hook energy (despair, rock bottom, facing impossible odds)
2. Develops key emotional moments in sequence:
   - Initial despair/rock bottom (prison, addiction, facing death, "life is over")
   - Disbelief in opportunity ("didn't believe it, sounded impossible")
   - Determination to change (fighting for enrollment, seeking help)
   - Breakthrough moments (first time allowed to think/build, vulnerability, spiritual awakening)
   - Transformation (job offer, education achievement, license reinstatement)
   - Redemption (first day of freedom, tears of joy, practicing again)
3. Shows the emotional arc: despair → disbelief → determination → breakthrough → transformation → redemption
4. Emphasizes ESL resonance multipliers throughout (Building New Life, Belonging & Identity, Connection Across Differences, Overcoming "Not Good Enough", Persistence, First-Time Courage)
5. Combines elements from all source themes:
   - Prison to career transformation (Source 1)
   - Education and community building (Source 2)
   - Addiction recovery and license reinstatement (Source 3)
6. Ends with realization of redemption, belonging, and new purpose
7. Uses original language and structure (NOT copying from sources)
8. Is appropriate for A1 level ESL learners:
   - Short sentences (6-12 words)
   - Simple vocabulary
   - Clear, direct language
   - Present and simple past tense
9. Uses generic character names (e.g., Maria, David, Sofia) - NEVER use real names from sources (never Brett Buskirk, Sean Pica, or any real names)

Return ONLY the story text, no explanations.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a skilled storyteller writing original narratives for A1 level ESL learners. You NEVER copy text from sources - you create original stories based on themes and emotional moments. Your writing is simple, clear, and appropriate for A1 level learners (short sentences, simple words, basic grammar). You always use generic character names (Maria, David, Sofia, etc.), never real names from sources (never Brett Buskirk, Sean Pica, or any real names).',
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
    
    // Clean markdown/metadata characters (Step 7.25 from MASTER_MISTAKES_PREVENTION)
    storyText = storyText
      .replace(/^#{1,6}\s+/gm, '')
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/__([^_]+)__/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/_([^_]+)_/g, '$1')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
      .replace(/\s@\s/g, ' ')
      .replace(/\s\/\s/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
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

