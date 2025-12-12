#!/usr/bin/env node

/**
 * Simplify "Community Builder #3" to A1 level
 * Target: At least 20 minutes reading time (A1 level)
 * Note: Original is already A1/A2 level but needs expansion from 1,171 words to ~1,600 words
 */

const { config } = require('dotenv');
const fs = require('fs');
const path = require('path');
const OpenAI = require('openai');

// Load environment variables
config({ path: path.join(__dirname, '..', '.env.local') });

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const STORY_ID = 'community-builder-3';
const CACHE_DIR = path.join(__dirname, '..', 'cache');

const INPUT_FILE = path.join(CACHE_DIR, `${STORY_ID}-original.txt`);
const OUTPUT_FILE_A1 = path.join(CACHE_DIR, `${STORY_ID}-A1-simplified.txt`);

async function simplifyToA1() {
  console.log('📖 Simplifying Community Builder #3 to A1 level...');
  console.log('🎯 Target: At least 20 minutes reading time (~1,600 words)');

  // Read original text
  if (!fs.existsSync(INPUT_FILE)) {
    console.error(`❌ Input file not found: ${INPUT_FILE}`);
    process.exit(1);
  }

  const originalStory = fs.readFileSync(INPUT_FILE, 'utf-8');
  const currentWordCount = originalStory.split(/\s+/).length;
  const targetWordCount = 1600; // Target for 20 minutes A1 level (~80 words/min)

  console.log(`📊 Original: ${currentWordCount} words (~${Math.round(currentWordCount / 80)} minutes)`);
  console.log(`🎯 Target: ${targetWordCount} words (~20 minutes)`);

  // Load themes for context
  const themesFile = path.join(CACHE_DIR, `${STORY_ID}-themes.json`);
  let themes = null;
  if (fs.existsSync(themesFile)) {
    themes = JSON.parse(fs.readFileSync(themesFile, 'utf-8'));
    console.log('✅ Loaded themes for context');
  }

  const prompt = `You are simplifying and expanding a composite community building story for ESL learners at A1 level.

CRITICAL: This is a COMPOSITE story combining elements from multiple sources. Character name is Nathan (generic, fictional).

ORIGINAL STORY (A1/A2 level, ${currentWordCount} words):
${originalStory}

EXPAND AND SIMPLIFY to A1 level with these requirements:

**A1 LANGUAGE RULES (MANDATORY):**
- **Sentence length:** Maximum 12 words per sentence (most sentences should be 8-10 words)
- **Vocabulary:** Only common, simple words (house, walk, talk, sad, happy, help, friend, people)
- **Grammar:** Present simple, past simple ONLY - no complex tenses
- **Connectors:** Only "and", "but", "when", "then", "because"
- **1:1 sentence mapping:** Keep same number of sentences as original (169 sentences)

**TARGET LENGTH:** ${targetWordCount} words (~20 minutes reading time)
**EXPANSION NEEDED:** Add ~${targetWordCount - currentWordCount} words by expanding emotional moments and key scenes

**KEEP ALL KEY EMOTIONAL MOMENTS:**
1. Feeling like an outsider despite having friends
2. False security: "I had made my friends. Done. Check."
3. COVID isolation and breakup - darkest point
4. Dating apps making disconnection worse
5. Failed social attempts at clubs and events
6. First walk breakthrough: 12 people joining, immediate connection
7. Deep sense of belonging achieved
8. Community growing from 12 to thousands
9. Mother's goodbye at river (refugee journey part)
10. Five-day walk, physical struggle
11. Learning of mother's death
12. Storytelling training - finding purpose
13. Becoming "voice of the voiceless"
14. World Economic Forum speaker - ultimate transformation

**THEMES TO PRESERVE:**
- Creating belonging through action
- Loneliness and isolation
- Taking action when existing solutions fail
- Small beginnings growing into transformation
- Community heals isolation
- Finding purpose through helping others
- Persistence despite setbacks

**SIMPLIFICATION AND EXPANSION STRATEGY:**
- Expand emotional moments with simple, clear detail
- Break long sentences into 2-3 short sentences (max 12 words each)
- Replace complex words with simple words
- Add more dialogue (easier for A1 learners)
- Expand key scenes: first walk, community growth, refugee journey moments
- Use simple, concrete language throughout
- Keep emotional core but use simpler language

**CHARACTER NAME:** Nathan (generic, NOT a real person)
**SETTING:** Generic city, refugee camp - no specific locations

**CRITICAL:** Maintain 169 sentences (1:1 mapping). Expand each sentence with more detail while keeping it under 12 words.

Return ONLY the simplified and expanded A1 story text, no explanations.`;

  try {
    console.log('\n🤖 Sending to OpenAI for simplification and expansion...');
    console.log('⏳ This may take 30-60 seconds...\n');

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are an expert at simplifying and expanding stories for A1 level ESL learners. You write in very short sentences (max 12 words), use only simple vocabulary, and maintain emotional impact while keeping language accessible. You always use generic character names for composite stories.',
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
    const finalSentences = simplifiedStory.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const finalSentenceCount = finalSentences.length;
    const avgWordsPerSentence = Math.round(finalWordCount / finalSentenceCount);
    
    // Check max sentence length
    const maxSentenceLength = Math.max(...finalSentences.map(s => s.trim().split(/\s+/).length));
    const sentencesOver12 = finalSentences.filter(s => s.trim().split(/\s+/).length > 12).length;

    console.log(`\n✅ Simplification complete!`);
    console.log(`📊 Final: ${finalWordCount} words`);
    console.log(`📊 Sentences: ${finalSentenceCount}`);
    console.log(`📊 Avg sentence length: ${avgWordsPerSentence} words`);
    console.log(`📊 Max sentence length: ${maxSentenceLength} words`);
    console.log(`📊 Sentences over 12 words: ${sentencesOver12}`);
    console.log(`⏱️  Estimated reading time: ~${Math.round(finalWordCount / 80)} minutes (A1 level)`);

    if (avgWordsPerSentence > 12) {
      console.log(`\n⚠️  WARNING: Average sentence length (${avgWordsPerSentence}) exceeds A1 maximum (12 words)`);
      console.log(`   Consider running script again with stricter sentence length requirements.`);
    }

    if (sentencesOver12 > 0) {
      console.log(`\n⚠️  WARNING: ${sentencesOver12} sentences exceed 12-word limit`);
      console.log(`   These may need manual adjustment for perfect A1 compliance.`);
    }

    if (finalWordCount < 1500) {
      console.log(`\n⚠️  WARNING: Story is ${finalWordCount} words, target is ~1,600 words for 20 minutes`);
      console.log(`   Consider expanding further to meet minimum length requirement.`);
    } else if (finalWordCount >= 1500 && finalWordCount <= 1700) {
      console.log(`\n✅ Target length met: ${finalWordCount} words (20-minute minimum)`);
    }

    // Save A1 version
    fs.writeFileSync(OUTPUT_FILE_A1, simplifiedStory, 'utf-8');
    console.log(`\n💾 Saved to: ${OUTPUT_FILE_A1}`);

    return simplifiedStory;

  } catch (error) {
    console.error('❌ Error simplifying story:', error.message);
    throw error;
  }
}

if (require.main === module) {
  simplifyToA1().catch(console.error);
}

module.exports = { simplifyToA1 };

