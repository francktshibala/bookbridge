/**
 * Step 7: Generate Combined Preview Text
 * Combines preview + background context + emotional hook into unified intro section
 */

const fs = require('fs');
const path = require('path');
const { OpenAI } = require('openai');

require('dotenv').config({ path: '.env.local' });

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const STORY_ID = 'community-builder-1';
const CEFR_LEVEL = 'A1';
const CACHE_DIR = path.join(__dirname, '..', 'cache');

async function generateCombinedPreview() {
  console.log('📝 Generating combined preview text for Community Builder...');
  
  // Load background and hook
  const background = fs.readFileSync(path.join(CACHE_DIR, `${STORY_ID}-background.txt`), 'utf-8').trim();
  const hook = fs.readFileSync(path.join(CACHE_DIR, `${STORY_ID}-hook.txt`), 'utf-8').trim();
  
  // Load story for context
  const storyFile = path.join(CACHE_DIR, `${STORY_ID}-A1-original.txt`);
  const story = fs.readFileSync(storyFile, 'utf-8').trim();
  
  const prompt = `You are creating a combined preview text for an ESL story at A1 level about community building.

CRITICAL RULES:
- Write at A1 level: short sentences (6-12 words), simple words, clear language
- Combine three sections: Preview + Hook + Background
- Total length: 130-225 words
- Use simple connectors: "and", "but", "when"
- Start with "About This Story" as the first line

STRUCTURE:
1. FIRST LINE: "About This Story"

2. PREVIEW (50-75 words): Meta-description style
   - Start with: "In this inspiring story..." or "This powerful story..."
   - Describe the journey: person who sees neighborhood need and builds community
   - Main theme: transformation, belonging, building connections
   - Key insight: one person can make a big difference
   - Impact: message about community strength and hope

3. EMOTIONAL HOOK (50-100 words): Start with struggle
   - Use the existing hook as inspiration but simplify to A1 level
   - Keep the emotional impact: seeing hunger, feeling shame, taking action

4. BACKGROUND CONTEXT (30-50 words): Neutral, factual tone
   - Set the scene: neighborhoods needing community spaces, food access, belonging
   - No spoilers about the story ending

BACKGROUND CONTEXT TO USE:
${background}

EMOTIONAL HOOK TO USE (simplify to A1):
${hook}

STORY SUMMARY (for context):
${story.substring(0, 500)}...

Write the combined preview text with all sections. Use A1 level language throughout. Return ONLY the combined text, no explanations.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a skilled writer creating preview text for A1 level ESL learners. Your writing is simple, clear, and emotionally engaging. You use short sentences and simple words.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
    });
    
    let combinedText = response.choices[0].message.content.trim();
    
    // Ensure "About This Story" is first line
    if (!combinedText.startsWith('About This Story')) {
      combinedText = 'About This Story\n\n' + combinedText;
    }
    
    // Save combined preview text
    const previewFile = path.join(CACHE_DIR, `${STORY_ID}-${CEFR_LEVEL}-preview-combined.txt`);
    fs.writeFileSync(previewFile, combinedText, 'utf-8');
    
    const wordCount = combinedText.split(/\s+/).length;
    const sentenceCount = combinedText.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
    const avgWordsPerSentence = (wordCount / sentenceCount).toFixed(1);
    
    console.log(`✅ Combined preview text saved to: ${previewFile}`);
    console.log(`📊 Statistics:`);
    console.log(`   - Words: ${wordCount}`);
    console.log(`   - Sentences: ${sentenceCount}`);
    console.log(`   - Avg words per sentence: ${avgWordsPerSentence}`);
    
    if (wordCount < 130 || wordCount > 225) {
      console.log(`⚠️  Warning: Target is 130-225 words. Current: ${wordCount} words`);
    }
    
    if (parseFloat(avgWordsPerSentence) > 12) {
      console.log(`⚠️  Warning: A1 target is 6-12 words per sentence. Current average: ${avgWordsPerSentence}`);
    }
    
    console.log(`\n📄 Preview text preview:`);
    console.log(`   "${combinedText.substring(0, 150)}..."`);
    
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

