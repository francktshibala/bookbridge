/**
 * Simplify Medical Crisis story to A1 level (1,600-1,800 words, ~20 minutes)
 * Composite story from 6 sources: Jill, Andy, Celeste, Anne, Richard, Janine
 */

const fs = require('fs');
const path = require('path');
const { OpenAI } = require('openai');

require('dotenv').config({ path: '.env.local' });

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const STORY_ID = 'medical-crisis-1';
const CACHE_DIR = path.join(__dirname, '..', 'cache');

async function simplifyToA1() {
  console.log('📖 Simplifying Medical Crisis composite story to A1 level...');

  const storyFile = path.join(CACHE_DIR, `${STORY_ID}-original.txt`);
  if (!fs.existsSync(storyFile)) {
    console.error('❌ Original story file not found.');
    return;
  }

  const originalStory = fs.readFileSync(storyFile, 'utf-8');
  const currentWordCount = originalStory.split(/\s+/).length;
  const targetWordCount = 1700; // Target for 20 minutes A1 level (~85 words/min)

  console.log(`📊 Original: ${currentWordCount} words (A2 level)`);
  console.log(`🎯 Target: ${targetWordCount} words (A1 level, ~20 minutes)`);

  // Load themes for context (optional)
  const themesFile = path.join(CACHE_DIR, `${STORY_ID}-themes.json`);
  let themes = null;
  if (fs.existsSync(themesFile)) {
    themes = JSON.parse(fs.readFileSync(themesFile, 'utf-8'));
    console.log('✅ Loaded themes for context');
  } else {
    console.log('ℹ️  No themes file found - using default themes');
    themes = {
      commonThemes: ['Hope', 'Resilience', 'Family Support', 'Identity Loss', 'Communication Barriers', 'Rebuilding']
    };
  }

  const prompt = `You are simplifying a composite medical crisis story for ESL learners at A1 level.

CRITICAL: This is a COMPOSITE story combining elements from 6 real survivors' stories. It is NOT about any single real person. Character name is Rachel (generic, fictional).

ORIGINAL STORY (A2 level, ${currentWordCount} words):
${originalStory}

SIMPLIFY to A1 level with these requirements:

**A1 LANGUAGE RULES (MANDATORY):**
- **Sentence length:** 6-12 words maximum (most sentences should be 8-10 words)
- **Vocabulary:** Only common, simple words (house, walk, speak, sad, happy, help)
- **Grammar:** Present simple, past simple ONLY - no complex tenses
- **Connectors:** Only "and", "but", "when", "then", "because"
- **1:1 sentence mapping:** Keep same number of sentences as original (or similar)

**TARGET LENGTH:** ${targetWordCount} words (~20 minutes reading time)

**KEEP ALL KEY EMOTIONAL MOMENTS:**
1. Language loss ("dog" moment) - Rachel can't speak
2. "You have me" (Emma's support)
3. Climbing stairs (12 steps victory)
4. Pelican wings metaphor (broken but beautiful)
5. "Pole pole" (slowly, slowly)
6. Visiting other patients (giving back)

**THEMES TO PRESERVE:**
${themes.commonThemes ? themes.commonThemes.map(t => `- ${t.theme || t}`).join('\n') : '- Hope\n- Resilience\n- Family support'}

**SIMPLIFICATION STRATEGY:**
- Break long sentences into 2-3 short sentences
- Replace complex words with simple words (e.g., "confident" → "strong", "therapist" → "helper", "colleague" → "friend at work")
- Remove metaphors that are too complex
- Keep emotional core but use simpler language
- Expand key scenes with simple, clear detail
- Use more dialogue (easier for A1 learners)

**CHARACTER NAME:** Rachel (generic, NOT a real person)
**SETTING:** Generic hospital, home - no specific location

Return ONLY the simplified A1 story text, no explanations.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are an expert at simplifying stories for A1 level ESL learners. You write in very short sentences (6-12 words), use only simple vocabulary, and maintain emotional impact while keeping language accessible. You always use generic character names for composite stories.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
    });

    let simplifiedStory = response.choices[0].message.content.trim();

    // Remove markdown code blocks if present
    if (simplifiedStory.startsWith('```')) {
      simplifiedStory = simplifiedStory.replace(/```[a-z]*\n?/g, '').replace(/```\s*$/g, '').trim();
    }

    // Clean markdown formatting
    simplifiedStory = simplifiedStory
      .replace(/\*\*([^*]+)\*\*/g, '$1')  // Remove bold
      .replace(/\*([^*]+)\*/g, '$1')      // Remove italic
      .replace(/__([^_]+)__/g, '$1')      // Remove underline
      .replace(/_([^_]+)_/g, '$1')        // Remove italic underline
      .replace(/^#{1,6}\s+/gm, '')        // Remove headings
      .replace(/`([^`]+)`/g, '$1')        // Remove code formatting
      .trim();

    const finalWordCount = simplifiedStory.split(/\s+/).length;
    const finalSentenceCount = simplifiedStory.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
    const avgWordsPerSentence = Math.round(finalWordCount / finalSentenceCount);

    console.log(`\n✅ Simplification complete!`);
    console.log(`📊 Final: ${finalWordCount} words`);
    console.log(`📊 Sentences: ${finalSentenceCount}`);
    console.log(`📊 Avg sentence length: ${avgWordsPerSentence} words`);
    console.log(`⏱️  Estimated reading time: ~${Math.round(finalWordCount / 85)} minutes (A1 level)`);

    if (avgWordsPerSentence > 12) {
      console.log(`\n⚠️  WARNING: Average sentence length (${avgWordsPerSentence}) exceeds A1 maximum (12 words)`);
      console.log(`   Consider running script again with stricter sentence length requirements.`);
    }

    // Save A1 version
    const outputFile = path.join(CACHE_DIR, `${STORY_ID}-A1-simplified.txt`);
    fs.writeFileSync(outputFile, simplifiedStory, 'utf-8');
    console.log(`\n💾 Saved to: ${outputFile}`);

  } catch (error) {
    console.error('❌ Error simplifying story:', error.message);
  }
}

simplifyToA1();
