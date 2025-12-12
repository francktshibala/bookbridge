/**
 * Extract themes from Career Pivot #3 sources
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

async function extractThemes() {
  console.log('📖 Extracting themes from Career Pivot #3 source material...');
  
  const sourceFile = path.join(CACHE_DIR, 'files', `${STORY_ID}-sources.txt`);
  
  if (!fs.existsSync(sourceFile)) {
    console.error(`❌ Source file not found: ${sourceFile}`);
    return;
  }
  
  const sourceContent = fs.readFileSync(sourceFile, 'utf-8');
  
  const prompt = `You are extracting THEMES and EMOTIONAL MOMENTS from source material about career pivot/professional transformation (teacher to software engineer).

DO NOT copy any text. Extract only:
1. Themes (career pivot, professional transformation, identity shift, mindset change, assumptions challenged, learning journey, financial risk, identity deconstruction)
2. Emotional moments (7+ moments: panel moment, blanking, stereotype shattered, "I wanted her superpower", vow, financial fear, identity struggle, breakthrough)
3. Story arc (struggle → revelation → desire → risk → perseverance → breakthrough → transformation)
4. ESL resonance multipliers

Source:
${sourceContent.substring(0, 10000)}

Extract themes and emotional moments in JSON format:
{
  "themes": ["theme1", "theme2", ...],
  "emotionalMoments": [
    {"moment": "description", "emotionalWeight": "high/medium/low", "source": "1/2/all"},
    ...
  ],
  "eslResonanceMultipliers": [
    "Learning & Education Journeys",
    "Overcoming 'Not Good Enough'",
    "First-Time Courage",
    "Building New Life",
    "Persistence Despite Setbacks"
  ],
  "storyArc": {
    "struggle": ["struggle1", "struggle2", ...],
    "perseverance": ["perseverance1", "perseverance2", ...],
    "breakthrough": ["breakthrough1", "breakthrough2", ...]
  }
}`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a content researcher extracting themes and emotional moments. You NEVER copy text - only extract themes, ideas, and emotional beats.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3,
    });
    
    const themesJson = JSON.parse(response.choices[0].message.content);
    
    const themesFile = path.join(CACHE_DIR, `${STORY_ID}-themes.json`);
    fs.writeFileSync(themesFile, JSON.stringify(themesJson, null, 2), 'utf-8');
    
    console.log(`✅ Themes extracted and saved to: ${themesFile}`);
    console.log(`📊 Extracted:`);
    console.log(`   - Themes: ${themesJson.themes.length}`);
    console.log(`   - Emotional moments: ${themesJson.emotionalMoments.length}`);
    console.log(`   - ESL multipliers: ${themesJson.eslResonanceMultipliers.length}`);
    
    return themesJson;
  } catch (error) {
    console.error('❌ Error extracting themes:', error.message);
    throw error;
  }
}

if (require.main === module) {
  extractThemes().catch(console.error);
}

module.exports = { extractThemes };

