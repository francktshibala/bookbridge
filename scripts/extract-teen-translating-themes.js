/**
 * Extract themes from multiple sources for "Teen Translating for Parents Through Hospital Chaos"
 * 
 * IMPORTANT: This script processes manually fetched source material.
 * Before running:
 * 1. Manually fetch Vox First Person article and save to cache/teen-translating-hospital-source-vox.txt
 * 2. Find 2-3 additional sources (news articles, interviews) and save to cache/teen-translating-hospital-source-*.txt
 * 3. Read all sources and extract THEMES ONLY (not text) - this is legal compliance
 */

const fs = require('fs');
const path = require('path');
const { OpenAI } = require('openai');

require('dotenv').config({ path: '.env.local' });

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const STORY_ID = 'teen-translating-hospital';
const CACHE_DIR = path.join(__dirname, '..', 'cache');

/**
 * Extract themes from source material using AI
 * This extracts ONLY themes/emotional moments, NOT text (legal compliance)
 */
async function extractThemes() {
  console.log('📖 Extracting themes from source material...');
  console.log('⚠️  Remember: Extract THEMES only, not text (legal compliance)');
  
  // Read source files
  const sourceFiles = [
    path.join(CACHE_DIR, `${STORY_ID}-source-chalkbeat.txt`),
    path.join(CACHE_DIR, `${STORY_ID}-source-2.txt`),
  ];
  
  // Check for source 3 in both possible locations
  const source3Path1 = path.join(CACHE_DIR, `${STORY_ID}-source-3.txt`);
  const source3Path2 = path.join(CACHE_DIR, 'files', `${STORY_ID}-source-3.txt`);
  if (fs.existsSync(source3Path1)) {
    sourceFiles.push(source3Path1);
  } else if (fs.existsSync(source3Path2)) {
    sourceFiles.push(source3Path2);
  }
  
  const sources = [];
  for (const file of sourceFiles) {
    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file, 'utf-8');
      sources.push({
        filename: path.basename(file),
        content: content.substring(0, 5000), // Limit to first 5000 chars per source
      });
    } else {
      console.log(`⚠️  Source file not found: ${file}`);
      console.log(`   Please manually fetch and save source material first.`);
    }
  }
  
  if (sources.length === 0) {
    console.error('❌ No source files found. Please fetch source material first.');
    console.log('\n📋 Instructions:');
    console.log('1. Manually access Vox First Person article');
    console.log('2. Save raw text to cache/teen-translating-hospital-source-vox.txt');
    console.log('3. Find 2-3 additional sources and save to cache/teen-translating-hospital-source-*.txt');
    console.log('4. Run this script again');
    return;
  }
  
  console.log(`✅ Found ${sources.length} source(s)`);
  
  // Extract themes using AI (NOT copying text)
  const prompt = `You are extracting THEMES and EMOTIONAL MOMENTS from source material. 
DO NOT copy any text. Extract only:
1. Themes (language barriers, medical emergencies, teen advocacy, confidence building)
2. Emotional moments (7 moments: parents' emergency, teen realizes she must translate, fear of mistakes, first successful translation, doctor's recognition, confidence building, realization of strength)
3. Facts (dates, locations, names - these are not protected by copyright)

Sources:
${sources.map((s, i) => `Source ${i + 1} (${s.filename}):\n${s.content}`).join('\n\n---\n\n')}

Extract themes and emotional moments in JSON format:
{
  "themes": ["theme1", "theme2", ...],
  "emotionalMoments": [
    {"moment": "description", "emotionalWeight": "high/medium/low"},
    ...
  ],
  "facts": {
    "dates": [],
    "locations": [],
    "names": []
  },
  "eslResonanceMultipliers": [
    "Communication & Language Barriers",
    "First-Time Courage",
    "Building New Life",
    "Connection Across Differences"
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

