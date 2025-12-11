/**
 * Extract themes and emotional moments from Disability Overcome #2 (Erik Weihenmayer) source material
 * IMPORTANT: Extract THEMES only, not text (legal compliance)
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

async function extractThemes() {
  console.log('📖 Extracting themes from Disability Overcome #2 (Erik Weihenmayer) source material...');
  console.log('⚠️  Remember: Extract THEMES only, not text (legal compliance)');

  // Read the research document
  const researchDocPath = path.join(CACHE_DIR, 'files', 'DISABILITY-OVERCOME-2-ERIK-WEIHENMAYER-COMPLETE.txt');
  
  if (!fs.existsSync(researchDocPath)) {
    console.error('❌ Research document not found:', researchDocPath);
    console.log('   Please ensure the research document is saved in cache/files/');
    return;
  }

  const researchContent = fs.readFileSync(researchDocPath, 'utf-8');
  console.log(`✅ Found research document (${researchContent.length} characters)`);

  const prompt = `You are extracting THEMES and EMOTIONAL MOMENTS from source material about Erik Weihenmayer, a blind mountaineer who climbed Mount Everest and founded No Barriers nonprofit.

DO NOT copy any text. Extract only:
1. Themes (disability overcome, visual impairment, mountaineering, adaptation, persistence, identity transformation, teamwork, helping others, building new life)
2. Emotional moments (7-12 moments: diagnosis, going blind, mother's death, wrestling breakthrough, rock climbing rebirth, Everest climb, Seven Summits, No Barriers founding)
3. Facts (dates, locations, achievements - these are not protected by copyright)
4. Story arc (struggle → perseverance → breakthrough)
5. ESL resonance multipliers (why this resonates with ESL learners)
6. Key quotes (memorable phrases that capture the essence)

Research Document:
${researchContent.substring(0, 12000)} // Limit to first 12000 chars

Extract themes and emotional moments in JSON format:
{
  "themes": ["theme1", "theme2", ...],
  "emotionalMoments": [
    {"moment": "description", "emotionalWeight": "high/medium/low", "section": "section name"},
    ...
  ],
  "facts": {
    "dates": [],
    "locations": [],
    "achievements": []
  },
  "storyArc": {
    "struggle": ["struggle moment 1", "struggle moment 2", ...],
    "perseverance": ["perseverance moment 1", "perseverance moment 2", ...],
    "breakthrough": ["breakthrough moment 1", "breakthrough moment 2", ...]
  },
  "eslResonanceMultipliers": [
    "Communication & Language Barriers",
    "Overcoming 'Not Good Enough'",
    "Persistence Despite Setbacks",
    "Building New Life",
    "Belonging & Identity",
    "First-Time Courage",
    "Connection Across Differences"
  ],
  "keyQuotes": [
    "quote 1",
    "quote 2",
    ...
  ]
}`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a content researcher extracting themes and emotional moments from source material. You NEVER copy text - only extract themes, ideas, and facts (which are not protected by copyright).',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    });

    const extracted = JSON.parse(response.choices[0].message.content);

    // Save to cache
    const outputPath = path.join(CACHE_DIR, `${STORY_ID}-themes.json`);
    fs.writeFileSync(outputPath, JSON.stringify(extracted, null, 2));

    console.log('\n✅ Themes extracted successfully!');
    console.log(`📁 Saved to: ${outputPath}`);
    console.log(`\n📊 Summary:`);
    console.log(`   Themes: ${extracted.themes.length}`);
    console.log(`   Emotional Moments: ${extracted.emotionalMoments.length}`);
    console.log(`   ESL Multipliers: ${extracted.eslResonanceMultipliers.length}`);
    console.log(`   Key Quotes: ${extracted.keyQuotes.length}`);

  } catch (error) {
    console.error('❌ Error extracting themes:', error.message);
    if (error.response) {
      console.error('   Response:', error.response.data);
    }
  }
}

extractThemes();

