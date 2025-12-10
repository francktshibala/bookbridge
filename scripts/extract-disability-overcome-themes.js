/**
 * Extract themes and emotional moments from Disability Overcome source material
 * IMPORTANT: Extract THEMES only, not text (legal compliance)
 */

const fs = require('fs');
const path = require('path');
const { OpenAI } = require('openai');

require('dotenv').config({ path: '.env.local' });

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const STORY_ID = 'disability-overcome-1';
const CACHE_DIR = path.join(__dirname, '..', 'cache');

async function extractThemes() {
  console.log('📖 Extracting themes from Disability Overcome source material...');
  console.log('⚠️  Remember: Extract THEMES only, not text (legal compliance)');

  const sourceFiles = [
    path.join(CACHE_DIR, 'files', `${STORY_ID}-source-1.txt`),
    path.join(CACHE_DIR, 'files', `${STORY_ID}-source-2.txt`),
    path.join(CACHE_DIR, 'files', `${STORY_ID}-source-3.txt`),
  ];

  const sources = [];
  for (const file of sourceFiles) {
    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file, 'utf-8');
      sources.push({
        filename: path.basename(file),
        content: content.substring(0, 6000), // Limit to first 6000 chars per source
      });
    } else {
      console.log(`⚠️  Source file not found: ${file}`);
      console.log(`   Please manually fetch and save source material first.`);
    }
  }

  if (sources.length === 0) {
    console.error('❌ No source files found. Please fetch source material first.');
    return;
  }

  console.log(`✅ Found ${sources.length} source(s)`);

  const prompt = `You are extracting THEMES and EMOTIONAL MOMENTS from source material about people who overcome disabilities to achieve their dreams.
DO NOT copy any text. Extract only:
1. Themes (disability overcome, adaptation, finding new ways, persistence, identity transformation, communication barriers, belonging, building new life)
2. Emotional moments (7-9 moments: initial loss/struggle, identity crisis, deep depression, finding new methods, breakthrough moment, persistence despite setbacks, transformation, ongoing challenges)
3. Facts (dates, locations, names - these are not protected by copyright)

Sources:
${sources.map((s, i) => `Source ${i + 1} (${s.filename}):\n${s.content}`).join('\n\n---\n\n')}

Extract themes and emotional moments in JSON format:
{
  "themes": ["theme1", "theme2", ...],
  "emotionalMoments": [
    {"moment": "description", "emotionalWeight": "high/medium/low", "source": "1/2/3"},
    ...
  ],
  "facts": {
    "dates": [],
    "locations": [],
    "names": []
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
  "storyArc": {
    "struggle": [],
    "perseverance": [],
    "breakthrough": []
  },
  "keyQuotes": {
    "source1": [],
    "source2": [],
    "source3": []
  }
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
    });

    // Clean response - remove markdown code blocks if present
    let content = response.choices[0].message.content.trim();
    if (content.startsWith('```json')) {
      content = content.replace(/^```json\n?/, '').replace(/\n?```$/, '');
    } else if (content.startsWith('```')) {
      content = content.replace(/^```\n?/, '').replace(/\n?```$/, '');
    }
    
    const themesJson = JSON.parse(content);

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

