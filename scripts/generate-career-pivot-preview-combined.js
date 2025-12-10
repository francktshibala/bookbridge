/**
 * Generate combined preview text (Preview + Background + Hook) for Career Pivot story
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

const STORY_ID = 'career-pivot-1';
const CEFR_LEVEL = 'A1';
const CACHE_DIR = path.join(__dirname, '..', 'cache');

async function generateCombinedPreview() {
  console.log('📝 Generating combined preview text for Career Pivot...');
  
  // Load background, hook, and story
  const background = fs.readFileSync(path.join(CACHE_DIR, `${STORY_ID}-background.txt`), 'utf-8').trim();
  const hook = fs.readFileSync(path.join(CACHE_DIR, `${STORY_ID}-hook.txt`), 'utf-8').trim();
  const story = fs.readFileSync(path.join(CACHE_DIR, `${STORY_ID}-A1-original.txt`), 'utf-8').trim();
  
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
- Meta-description style: "In this inspiring story..."
- Describe the person and their challenge
- Mention the main theme (career pivot, burnout, following passion)
- Key insight: "Through [courage/change], [they] achieved..."
- Impact: "A [adjective] message about [outcome]..."

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

Total target: 130-225 words
Return ONLY the combined text, no explanations.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are creating combined preview text for A1 level ESL learners. You follow the exact format with double newlines between sections. Your writing is simple, clear, and appropriate for A1 level (short sentences, simple words, basic grammar).',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.5,
    });
    
    let combinedText = response.choices[0].message.content.trim();
    
    // Remove markdown code blocks if present
    if (combinedText.startsWith('```')) {
      combinedText = combinedText.replace(/^```[a-z]*\n?/, '').replace(/\n?```$/, '');
    }
    
    // Ensure proper format: "About This Story" → blank line → content
    if (!combinedText.startsWith('About This Story')) {
      combinedText = 'About This Story\n\n' + combinedText;
    }
    
    // Ensure double newlines between sections
    combinedText = combinedText.replace(/\n\n\n+/g, '\n\n'); // Normalize multiple newlines
    
    // Save combined preview
    const previewFile = path.join(CACHE_DIR, `${STORY_ID}-${CEFR_LEVEL}-preview-combined.txt`);
    fs.writeFileSync(previewFile, combinedText, 'utf-8');
    
    const wordCount = combinedText.split(/\s+/).length;
    const sentenceCount = combinedText.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
    
    console.log(`✅ Combined preview generated and saved to: ${previewFile}`);
    console.log(`📊 Statistics:`);
    console.log(`   - Words: ${wordCount} (target: 130-225)`);
    console.log(`   - Sentences: ${sentenceCount}`);
    
    // Verify format
    const lines = combinedText.split('\n');
    const hasAboutThisStory = lines[0].trim() === 'About This Story';
    const hasBlankLineAfterTitle = lines[1].trim() === '';
    
    if (hasAboutThisStory && hasBlankLineAfterTitle) {
      console.log(`✅ Format check: PASSED (starts with "About This Story" + blank line)`);
    } else {
      console.log(`⚠️  Format check: May need adjustment`);
      console.log(`   First line: "${lines[0]}"`);
      console.log(`   Second line: "${lines[1]}"`);
    }
    
    return combinedText;
  } catch (error) {
    console.error('❌ Error generating combined preview:', error.message);
    throw error;
  }
}

if (require.main === module) {
  generateCombinedPreview().catch(console.error);
}

module.exports = { generateCombinedPreview };

