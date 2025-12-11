/**
 * Generate combined preview text (Preview + Background + Hook) for Single Parent Rising #1 story
 * TARGET: A1 level, 130-225 words total
 * FORMAT: "About This Story" → blank line → Preview → blank line → Hook → blank line → Background
 */

const fs = require('fs');
const path = require('path');
const { OpenAI } = require('openai');

require('dotenv').config({ path: '.env.local' });

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const STORY_ID = 'single-parent-rising-1';
const CEFR_LEVEL = 'A1';
const CACHE_DIR = path.join(__dirname, '..', 'cache');

async function generateCombinedPreview() {
  console.log('📝 Generating combined preview text for Single Parent Rising #1...');

  // Load background, hook, and story
  const background = fs.readFileSync(path.join(CACHE_DIR, `${STORY_ID}-background.txt`), 'utf-8').trim();
  const hook = fs.readFileSync(path.join(CACHE_DIR, `${STORY_ID}-hook.txt`), 'utf-8').trim();
  const story = fs.readFileSync(path.join(CACHE_DIR, `${STORY_ID}-A1-simplified.txt`), 'utf-8').trim();

  // Get story summary (first 200 words)
  const storySummary = story.split(/\s+/).slice(0, 200).join(' ');

  const prompt = `You are creating a combined preview text for an ESL story at A1 level.

CRITICAL FORMAT REQUIREMENTS:
- Line 1: "About This Story"
- Line 2: (blank line)
- Line 3: Preview section (50-75 words, meta-description style)
- Line 4: (blank line)
- Line 5: Hook section (50-100 words, starts with struggle)
- Line 6: (blank line)
- Line 7: Background section (30-50 words, factual)

A1 LEVEL REQUIREMENTS:
- Short sentences (6-12 words average)
- Simple words (common vocabulary)
- Simple connectors: "and", "but", "when"
- Present tense and simple past tense

PREVIEW SECTION (50-75 words):
- Meta-description style: "In this powerful story..."
- Describe Lisa and her struggle (suddenly alone with three children, no job, no savings)
- Mention transformation (finding strength through "Parents for Life" package, going back to school, building new life)
- Key themes: single parent, overcoming obstacles, building new life, children as motivation, education journey
- Impact: "An inspiring story about a single mother finding strength through her children and building a better life"
- Use character name "Lisa" (composite story from 3 sources, NOT based on any single real person)

HOOK SECTION (50-100 words):
- Use the provided hook text (starts with struggle)
- Keep the emotional energy and curiosity

BACKGROUND SECTION (30-50 words):
- Use the provided background text
- Neutral, factual tone

STORY SUMMARY (for context):
${storySummary}

PROVIDED HOOK:
${hook}

PROVIDED BACKGROUND:
${background}

Create the combined preview text following the exact format:
Line 1: "About This Story"
Line 2: (blank line)
Line 3-?: Preview section (50-75 words)
Line ?: (blank line)
Line ?-?: Hook section (50-100 words)
Line ?: (blank line)
Line ?-?: Background section (30-50 words)

Return ONLY the combined preview text with proper line breaks. No explanations.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are an expert at creating preview texts for A1 level ESL stories. You write in very short sentences (6-12 words), use only simple vocabulary, and follow exact formatting requirements.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
    });

    let previewText = response.choices[0].message.content.trim();

    // Remove markdown code blocks if present
    if (previewText.startsWith('```')) {
      previewText = previewText.replace(/```[a-z]*\n?/g, '').replace(/```\s*$/g, '').trim();
    }

    // Clean markdown formatting
    previewText = previewText
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/^#{1,6}\s+/gm, '')
      .replace(/`([^`]+)`/g, '$1')
      .trim();

    const wordCount = previewText.split(/\s+/).length;

    console.log(`\n✅ Preview text generated!`);
    console.log(`📊 Total words: ${wordCount}`);
    console.log(`📊 Target: 130-225 words`);

    if (wordCount < 130 || wordCount > 225) {
      console.log(`\n⚠️  WARNING: Word count (${wordCount}) outside target range (130-225)`);
    }

    // Verify format has double newlines
    if (!previewText.includes('\n\n')) {
      console.log(`\n⚠️  WARNING: Missing double newlines between sections`);
      console.log(`   This may cause parsing issues in the frontend.`);
    }

    // Save combined preview
    const outputFile = path.join(CACHE_DIR, `${STORY_ID}-${CEFR_LEVEL}-preview-combined.txt`);
    fs.writeFileSync(outputFile, previewText, 'utf-8');
    console.log(`\n💾 Saved to: ${outputFile}`);

    console.log(`\n📄 Preview text:`);
    console.log(previewText);

  } catch (error) {
    console.error('❌ Error generating preview text:', error.message);
  }
}

generateCombinedPreview();

