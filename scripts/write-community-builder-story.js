/**
 * Write original narrative story based on extracted themes
 * IMPORTANT: This creates ORIGINAL text based on themes, NOT copying from sources
 * TARGET: A1 level directly (simpler language, shorter sentences)
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

async function writeMainStory() {
  console.log('✍️  Writing original Community Builder narrative story at A1 level...');
  console.log('⚠️  Creating ORIGINAL text based on themes, NOT copying from sources');
  
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
- Use DIVERSE, CULTURALLY APPROPRIATE character names - AVOID repeating names from previous stories
- DO NOT use: Maria, David, Sofia (already used in multiple stories)
- For community/immigrant stories, use Hispanic/Latino names: Ana, Carlos, Diego, Elena, Gabriel, Isabella, Javier, Lucia, Miguel, Rosa, Santiago, Valentina
- Use unique names per story to avoid confusion
- NOT real names from sources (NOT Ron Finley, NOT Manuel Castro, NOT Rana Abdelhamid)
- Target length: 1,600-1,700 words (20 minutes reading time for A1 level)
- Use SIMPLE language appropriate for A1 CEFR level:
  * Short sentences (6-12 words average)
  * Simple words (common vocabulary)
  * Simple connectors: "and", "but", "when", "then"
  * Present tense and simple past tense
  * Avoid complex grammar
- Structure: struggle → recognition → action → perseverance → breakthrough → transformation
- Include key emotional moments in order
- Make it engaging and emotionally impactful
- Combine themes from all three sources into ONE unified story

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
1. Starts with the emotional hook energy (neighborhood need, isolation, seeing hunger)
2. Develops key emotional moments in sequence:
   - Living in neighborhood with no fresh food / feeling isolated
   - Seeing mother and child looking for food at night (shame moment)
   - Finding refuge/safety in a place (like library)
   - Deciding to take first action (planting garden, starting something)
   - Neighbors mocking or doubting
   - Facing obstacles (city rules, rejection, fear)
   - Persisting despite challenges
   - Community starting to respond (people helping, bringing things)
   - Transformation (neighborhood changes, people connect, belonging grows)
3. Shows the emotional arc: struggle → recognition → action → perseverance → breakthrough → transformation
4. Emphasizes ESL resonance multipliers throughout (Building New Life, Belonging, Connection, Overcoming, Persistence, First-Time Courage)
5. Combines elements from all three source themes:
   - Food access / community garden (Source 1)
   - Immigrant advocacy / safe spaces / library refuge (Source 2)
   - Community safety / empowerment / building connections (Source 3)
6. Ends with realization of community strength, belonging, and purpose
7. Uses original language and structure (NOT copying from sources)
8. Is appropriate for A1 level ESL learners:
   - Short sentences (6-12 words)
   - Simple vocabulary
   - Clear, direct language
   - Present and simple past tense
9. Uses DIVERSE Hispanic/Latino character names (avoid Maria, Sofia, Carlos if already used). Choose names like Ana, Diego, Elena, Gabriel, Isabella, Javier, Lucia, Miguel, Rosa, Santiago, Valentina. NEVER use real names from sources

Return ONLY the story text, no explanations.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a skilled storyteller writing original narratives for A1 level ESL learners. You NEVER copy text from sources - you create original stories based on themes and emotional moments. Your writing is simple, clear, and appropriate for A1 level learners (short sentences, simple words, basic grammar). You always use DIVERSE Hispanic/Latino character names (avoid Maria, Sofia, Carlos if already used - use Ana, Diego, Elena, Gabriel, Isabella, Javier, Lucia, Miguel, Rosa, Santiago, Valentina). Never use real names from sources (never Ron Finley, Manuel Castro, Rana Abdelhamid).',
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

