/**
 * Extract themes from multiple sources for "Community Builder: Stranger Transforms Neighborhood"
 * 
 * IMPORTANT: This script processes manually fetched source material.
 * Before running:
 * 1. Manually fetch source articles and save to cache/community-builder-1-source-*.txt
 * 2. Read all sources and extract THEMES ONLY (not text) - this is legal compliance
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

/**
 * Extract themes from source material using AI
 * This extracts ONLY themes/emotional moments, NOT text (legal compliance)
 */
async function extractThemes() {
  console.log('📖 Extracting themes from Community Builder source material...');
  console.log('⚠️  Remember: Extract THEMES only, not text (legal compliance)');
  
  // Read source files
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
        content: content.substring(0, 8000), // Limit to first 8000 chars per source
      });
    } else {
      console.log(`⚠️  Source file not found: ${file}`);
      console.log(`   Please manually fetch and save source material first.`);
    }
  }
  
  if (sources.length === 0) {
    console.error('❌ No source files found. Please fetch source material first.');
    console.log('\n📋 Instructions:');
    console.log('1. Manually access source articles');
    console.log('2. Save raw text to cache/files/community-builder-1-source-*.txt');
    console.log('3. Run this script again');
    return;
  }
  
  console.log(`✅ Found ${sources.length} source(s)`);
  
  // Extract themes using AI (NOT copying text)
  const prompt = `You are extracting THEMES and EMOTIONAL MOMENTS from source material about community builders who transform neighborhoods.
DO NOT copy any text. Extract only:
1. Themes (community building, belonging, transformation, persistence, overcoming barriers, food access, immigrant advocacy, community safety, building connections)
2. Emotional moments (7+ moments: initial struggle/isolation, recognition of need, first action, facing obstacles/mockery, breakthrough moments, community response, transformation)
3. Facts (dates, locations, names - these are not protected by copyright)
4. Story arc (struggle → recognition → action → perseverance → breakthrough → transformation)

Sources:
${sources.map((s, i) => `Source ${i + 1} (${s.filename}):\n${s.content}`).join('\n\n---\n\n')}

Extract themes and emotional moments in JSON format matching this structure:
{
  "themes": ["theme1", "theme2", ...],
  "emotionalMoments": [
    {"moment": "description", "emotionalWeight": "high/medium/low", "source": "1/2/3/all"},
    ...
  ],
  "facts": {
    "dates": [],
    "locations": [],
    "names": []
  },
  "eslResonanceMultipliers": [
    "Building New Life",
    "Belonging & Identity",
    "Connection Across Differences",
    "Overcoming 'Not Good Enough'",
    "Persistence Despite Setbacks",
    "First-Time Courage"
  ],
  "storyArc": {
    "struggle": ["struggle1", "struggle2", ...],
    "perseverance": ["perseverance1", "perseverance2", ...],
    "breakthrough": ["breakthrough1", "breakthrough2", ...]
  },
  "keyQuotes": {
    "source1": ["quote1", "quote2", ...],
    "source2": ["quote1", "quote2", ...],
    "source3": ["quote1", "quote2", ...]
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
    
    const themesJson = JSON.parse(response.choices[0].message.content);
    
    // Save themes
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

