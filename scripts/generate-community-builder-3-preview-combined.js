#!/usr/bin/env node

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

const STORY_ID = 'community-builder-3';
const CEFR_LEVEL = 'A1';
const CACHE_DIR = path.join(__dirname, '..', 'cache');

async function generateCombinedPreview() {
  console.log('📝 Generating combined preview text for Community Builder #3...');
  
  // Load background and hook
  const background = fs.readFileSync(path.join(CACHE_DIR, `${STORY_ID}-background.txt`), 'utf-8').trim();
  const hook = fs.readFileSync(path.join(CACHE_DIR, `${STORY_ID}-hook.txt`), 'utf-8').trim();
  
  // Load story for context
  const storyFile = path.join(CACHE_DIR, `${STORY_ID}-A1-simplified.txt`);
  const story = fs.readFileSync(storyFile, 'utf-8').trim();
  
  const prompt = `You are creating a combined preview text for an ESL story at A1 level about creating belonging through action.

CRITICAL RULES:
- Write at A1 level: short sentences (6-12 words), simple words, clear language
- Combine three sections: Preview + Hook + Background
- Total length: 130-225 words
- Use simple connectors: "and", "but", "when"
- Start with "About This Story" as the first line
- Use double newlines (\n\n) between sections

STRUCTURE:
1. FIRST LINE: "About This Story"

2. PREVIEW (50-75 words): Meta-description style
   - Start with: "In this inspiring story..." or "This powerful story..."
   - Describe Nathan's journey: loneliness → trying solutions → taking action → creating community
   - Also mention refugee journey part: helping others find their voice through storytelling
   - Main theme: creating belonging through action, taking initiative when solutions fail
   - Key insight: belonging doesn't just happen, you have to create it yourself
   - Impact: message about connection, community, and the power of taking action
   - Use character name "Nathan" (composite story from 2 sources, NOT based on any single real person)

3. EMOTIONAL HOOK (50-100 words): Start with struggle
   - Use the existing hook as inspiration but simplify to A1 level if needed
   - Keep the emotional impact: feeling like outsider, trying everything, deciding to take action

4. BACKGROUND CONTEXT (30-50 words): Neutral, factual tone
   - Set the scene: many people feel lonely, try dating apps and clubs, still feel disconnected
   - No spoilers about the story ending

BACKGROUND CONTEXT TO USE:
${background}

EMOTIONAL HOOK TO USE (simplify to A1 if needed):
${hook}

STORY SUMMARY (for context):
${story.substring(0, 500)}...

Write the combined preview text with all sections. Use A1 level language throughout. Use double newlines (\n\n) between sections. Return ONLY the combined text, no explanations.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a skilled writer creating preview text for A1 level ESL learners. Your writing is simple, clear, and emotionally engaging. You use short sentences (6-12 words) and simple words. You use double newlines (\n\n) between sections.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
    });
    
    let combinedText = response.choices[0].message.content.trim();
    
    // Remove markdown code blocks if present
    if (combinedText.startsWith('```')) {
      combinedText = combinedText.replace(/```[a-z]*\n?/g, '').replace(/```\s*$/g, '').trim();
    }

    // Clean markdown formatting
    combinedText = combinedText
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/^#{1,6}\s+/gm, '')
      .replace(/`([^`]+)`/g, '$1')
      .trim();
    
    // Ensure "About This Story" is first line
    if (!combinedText.startsWith('About This Story')) {
      combinedText = 'About This Story\n\n' + combinedText;
    }
    
    // Ensure double newlines between sections (replace triple+ with double)
    combinedText = combinedText.replace(/\n\n\n+/g, '\n\n');
    
    // Verify double newlines exist
    if (!combinedText.includes('\n\n')) {
      console.log('⚠️  Warning: No double newlines found. Adding them...');
      // Try to add double newlines between sections
      combinedText = combinedText.replace(/\n/g, '\n\n');
      combinedText = combinedText.replace(/\n\n\n+/g, '\n\n');
    }
    
    // Save combined preview text
    const previewFile = path.join(CACHE_DIR, `${STORY_ID}-${CEFR_LEVEL}-preview-combined.txt`);
    fs.writeFileSync(previewFile, combinedText, 'utf-8');
    
    const wordCount = combinedText.split(/\s+/).length;
    const sentenceCount = combinedText.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
    const avgWordsPerSentence = (wordCount / sentenceCount).toFixed(1);
    
    console.log(`\n✅ Combined preview text saved to: ${previewFile}`);
    console.log(`📊 Statistics:`);
    console.log(`   - Words: ${wordCount}`);
    console.log(`   - Sentences: ${sentenceCount}`);
    console.log(`   - Avg words per sentence: ${avgWordsPerSentence}`);
    
    // Verify double newlines
    const doubleNewlineCount = (combinedText.match(/\n\n/g) || []).length;
    console.log(`   - Double newlines: ${doubleNewlineCount}`);
    
    if (wordCount < 130 || wordCount > 225) {
      console.log(`\n⚠️  Warning: Target is 130-225 words. Current: ${wordCount} words`);
    }
    
    if (parseFloat(avgWordsPerSentence) > 12) {
      console.log(`\n⚠️  Warning: A1 target is 6-12 words per sentence. Current average: ${avgWordsPerSentence}`);
    }
    
    if (doubleNewlineCount < 2) {
      console.log(`\n⚠️  Warning: Expected at least 2 double newlines (between sections). Found: ${doubleNewlineCount}`);
      console.log(`   This may cause parsing issues in the frontend.`);
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

