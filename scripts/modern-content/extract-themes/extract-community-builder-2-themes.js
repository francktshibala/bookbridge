/**
 * Extract themes from Community Builder #2 (Luma Mufleh) research document using AI
 * IMPORTANT: This extracts ONLY themes/emotional moments, NOT text (legal compliance)
 */

const fs = require('fs');
const path = require('path');
const { OpenAI } = require('openai');

require('dotenv').config({ path: '.env.local' });

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const STORY_ID = 'community-builder-2';
const CACHE_DIR = path.join(__dirname, '..', 'cache');

/**
 * Extract themes from research document using AI
 * This extracts ONLY themes/emotional moments, NOT text (legal compliance)
 */
async function extractThemes() {
  console.log('📖 Extracting themes from Community Builder #2 (Luma Mufleh) research document...');
  console.log('⚠️  Remember: Extract THEMES only, not text (legal compliance)');

  // Read research document
  const researchFile = path.join(CACHE_DIR, 'files', 'COMMUNITY-BUILDER-STORY-LUMA-MUFLEH-COMPLETE.txt');
  
  if (!fs.existsSync(researchFile)) {
    console.error('❌ Research document not found:', researchFile);
    return;
  }

  const researchContent = fs.readFileSync(researchFile, 'utf-8');
  console.log(`✅ Found research document (${researchContent.length} characters)`);

  // Extract themes using AI (NOT copying text)
  const prompt = `You are extracting THEMES and EMOTIONAL MOMENTS from a research document about Luma Mufleh and the Fugees Family (community builder story: wrong turn → soccer team → refugee school network).

DO NOT copy any text. Extract only:
1. Themes (e.g., community building, belonging, transformation, food access, empowerment, building connections, persistence, educational justice, refugee support, mutual healing, soccer as universal language)
2. Emotional moments (15+ moments from the 22 identified: grandmother's flight, coming out/disowned, wrong turn, barefoot children, chopped fingers, can't read discovery, school founding, Ramadan healing, etc.)
3. Facts (dates, locations - these are not protected by copyright)
4. Story arc (privileged beginning → exile → drifting → wrong turn → discovery → transformation)
5. ESL Resonance Multipliers (all 6: Building New Life, Belonging & Identity, Connection Across Differences, Overcoming 'Not Good Enough', Persistence Despite Setbacks, First-Time Courage)
6. Key Quotes (short, impactful quotes that capture emotional moments or core philosophies - but paraphrase, don't copy exactly)

Research Document:
${researchContent.substring(0, 15000)} // Limit to first 15000 chars

Extract themes and emotional moments in JSON format matching this structure:
{
  "themes": ["theme1", "theme2", ...],
  "emotionalMoments": [
    {"moment": "description", "emotionalWeight": "high/medium/low", "source": "research"},
    ...
  ],
  "facts": {
    "dates": ["2004", "2016", ...],
    "locations": ["Jordan", "Clarkston, Georgia", ...],
    "organizations": ["Fugees Academy", "Smith College", ...]
  },
  "storyArc": {
    "struggle": "description",
    "perseverance": "description",
    "breakthrough": "description"
  },
  "eslResonanceMultipliers": [
    "Building New Life",
    "Belonging & Identity",
    "Connection Across Differences",
    "Overcoming 'Not Good Enough'",
    "Persistence Despite Setbacks",
    "First-Time Courage"
  ],
  "keyQuotes": [
    {"quote": "paraphrased quote", "context": "when/where it was said"},
    ...
  ]
}

Return ONLY valid JSON, no markdown formatting.`;

  try {
    console.log('🤖 Calling OpenAI to extract themes...');
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are an expert at extracting themes and emotional moments from research documents. You extract ONLY themes, not text, to ensure legal compliance.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3,
    });

    const themesJson = response.choices[0].message.content.trim();
    
    // Try to parse JSON (might be wrapped in markdown code blocks)
    let themes;
    try {
      themes = JSON.parse(themesJson);
    } catch (e) {
      // Try extracting JSON from markdown code blocks
      const jsonMatch = themesJson.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
      if (jsonMatch) {
        themes = JSON.parse(jsonMatch[1]);
      } else {
        throw new Error('Could not parse JSON from response');
      }
    }

    // Save themes to cache
    const themesFile = path.join(CACHE_DIR, `${STORY_ID}-themes.json`);
    fs.writeFileSync(themesFile, JSON.stringify(themes, null, 2));
    console.log(`✅ Themes extracted and saved to: ${themesFile}`);
    console.log(`\n📊 Summary:`);
    console.log(`   Themes: ${themes.themes?.length || 0}`);
    console.log(`   Emotional Moments: ${themes.emotionalMoments?.length || 0}`);
    console.log(`   ESL Multipliers: ${themes.eslResonanceMultipliers?.length || 0}`);

  } catch (error) {
    console.error('❌ Error extracting themes:', error.message);
    if (error.response) {
      console.error('   API Response:', error.response.data);
    }
  }
}

// Run extraction
extractThemes().catch(console.error);

