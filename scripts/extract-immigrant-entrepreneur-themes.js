/**
 * Extract themes from multiple sources for "Immigrant Entrepreneur: From Failure to Success"
 * 
 * IMPORTANT: This script processes manually fetched source material.
 * Before running:
 * 1. Ensure all 6 source files are saved in cache/immigrant-entrepreneur-source-*.txt
 * 2. Read all sources and extract THEMES ONLY (not text) - this is legal compliance
 */

const fs = require('fs');
const path = require('path');
const { OpenAI } = require('openai');

require('dotenv').config({ path: '.env.local' });

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const STORY_ID = 'immigrant-entrepreneur';
const CACHE_DIR = path.join(__dirname, '..', 'cache');

/**
 * Extract themes from source material using AI
 * This extracts ONLY themes/emotional moments, NOT text (legal compliance)
 */
async function extractThemes() {
  console.log('📖 Extracting themes from source material...');
  console.log('⚠️  Remember: Extract THEMES only, not text (legal compliance)');
  
  // Read all 6 source files
  const sourceFiles = [];
  for (let i = 1; i <= 6; i++) {
    const filePath = path.join(CACHE_DIR, `${STORY_ID}-source-${i}.txt`);
    if (fs.existsSync(filePath)) {
      sourceFiles.push(filePath);
    } else {
      console.log(`⚠️  Source file not found: ${filePath}`);
    }
  }
  
  if (sourceFiles.length === 0) {
    console.error('❌ No source files found. Please fetch source material first.');
    console.log('\n📋 Instructions:');
    console.log('1. Ensure all 6 source files are saved in cache/immigrant-entrepreneur-source-*.txt');
    console.log('2. Run this script again');
    return;
  }
  
  console.log(`✅ Found ${sourceFiles.length} source(s)`);
  
  const sources = [];
  for (const file of sourceFiles) {
    const content = fs.readFileSync(file, 'utf-8');
    sources.push({
      filename: path.basename(file),
      content: content.substring(0, 6000), // Limit to first 6000 chars per source
    });
  }
  
  // Extract themes using AI (NOT copying text)
  const prompt = `You are extracting THEMES and EMOTIONAL MOMENTS from multiple source materials about immigrant entrepreneurs. 
DO NOT copy any text. Extract only:
1. Themes (immigration, entrepreneurship, overcoming adversity, resilience, building new life, language barriers, cultural adaptation, hard work, perseverance, family support, business building, transformation)
2. Emotional moments (struggles, failures, breakthroughs, successes - identify 7-10 key moments)
3. Facts (dates, locations, industries, business types - these are not protected by copyright)
4. ESL resonance multipliers (themes that resonate with ESL learners)

Sources:
${sources.map((s, i) => `Source ${i + 1} (${s.filename}):\n${s.content}`).join('\n\n---\n\n')}

Extract themes and emotional moments in JSON format:
{
  "themes": ["theme1", "theme2", ...],
  "emotionalMoments": [
    {"moment": "description", "emotionalWeight": "high/medium/low", "source": "which source(s)"},
    ...
  ],
  "facts": {
    "industries": [],
    "countries": [],
    "challenges": [],
    "successes": []
  },
  "eslResonanceMultipliers": [
    "Communication & Language Barriers",
    "Building New Life",
    "Overcoming 'Not Good Enough'",
    "First-Time Courage",
    "Family & Belonging",
    "Connection Across Differences"
  ],
  "storyArc": {
    "struggle": "description",
    "perseverance": "description",
    "breakthrough": "description",
    "success": "description"
  }
}

IMPORTANT: Extract ONLY themes and emotional beats. Do NOT copy specific text or sentences from sources.`;

  try {
    console.log('\n🤖 Extracting themes using AI...');
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a theme extraction expert. Extract themes, emotional moments, and facts from source material. NEVER copy text directly - only extract abstract themes and emotional beats.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    });

    const extractedData = JSON.parse(response.choices[0].message.content);
    
    // Save extracted themes
    const outputPath = path.join(CACHE_DIR, `${STORY_ID}-themes.json`);
    fs.writeFileSync(outputPath, JSON.stringify(extractedData, null, 2));
    
    console.log('\n✅ Themes extracted successfully!');
    console.log(`📁 Saved to: ${outputPath}`);
    console.log(`\n📊 Summary:`);
    console.log(`   Themes: ${extractedData.themes?.length || 0}`);
    console.log(`   Emotional moments: ${extractedData.emotionalMoments?.length || 0}`);
    console.log(`   ESL resonance multipliers: ${extractedData.eslResonanceMultipliers?.length || 0}`);
    
    if (extractedData.emotionalMoments) {
      console.log(`\n🎭 Emotional Moments:`);
      extractedData.emotionalMoments.forEach((moment, i) => {
        console.log(`   ${i + 1}. ${moment.moment} (${moment.emotionalWeight})`);
      });
    }
    
    return extractedData;
  } catch (error) {
    console.error('❌ Error extracting themes:', error.message);
    throw error;
  }
}

if (require.main === module) {
  extractThemes()
    .then(() => {
      console.log('\n🎉 Theme extraction complete!');
      console.log('💡 Next step: Run Step 0.5 validation');
    })
    .catch((error) => {
      console.error('💥 Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { extractThemes };

