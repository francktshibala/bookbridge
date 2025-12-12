#!/usr/bin/env node

/**
 * Expand Community Builder #3 A1 story to meet target length (20 minutes minimum)
 */

const fs = require('fs');
const path = require('path');
const { OpenAI } = require('openai');

require('dotenv').config({ path: '.env.local' });

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const STORY_ID = 'community-builder-3';
const CACHE_DIR = path.join(__dirname, '..', 'cache');

async function expandStory() {
  console.log('📖 Expanding A1 Community Builder #3 story to meet target length...');
  
  // Load current simplified story
  const storyFile = path.join(CACHE_DIR, `${STORY_ID}-A1-simplified.txt`);
  if (!fs.existsSync(storyFile)) {
    console.error('❌ Story file not found. Run simplify-community-builder-3.js first.');
    return;
  }
  
  const currentStory = fs.readFileSync(storyFile, 'utf-8');
  const currentWordCount = currentStory.split(/\s+/).length;
  const targetWordCount = 1650; // Target for 20 minutes A1 level (80 words/min)
  
  console.log(`📊 Current: ${currentWordCount} words (~${Math.round(currentWordCount / 80)} minutes)`);
  console.log(`🎯 Target: ${targetWordCount} words (~20 minutes)`);
  console.log(`📈 Need to add: ~${targetWordCount - currentWordCount} words`);
  
  // Load themes for context
  const themesFile = path.join(CACHE_DIR, `${STORY_ID}-themes.json`);
  let themes = null;
  if (fs.existsSync(themesFile)) {
    themes = JSON.parse(fs.readFileSync(themesFile, 'utf-8'));
    console.log('✅ Loaded themes for context');
  }
  
  const prompt = `You are expanding a Community Builder story for ESL learners at A1 level. The current story is ${currentWordCount} words, and you need to expand it to approximately ${targetWordCount} words (target: 20 minutes reading time).

CRITICAL RULES:
- Keep ALL existing content - do NOT remove or change anything
- ADD detail, emotion, dialogue, and scenes to expand the story
- Maintain A1 level language:
  * Short sentences (6-12 words average, MAXIMUM 12 words per sentence)
  * Simple words (common vocabulary only)
  * Simple connectors: "and", "but", "when", "then", "because"
  * Present tense and simple past tense
  * Avoid complex grammar
- Maintain the same structure and emotional moments
- Keep generic character name: Nathan (NOT a real person)
- Target: ${targetWordCount} words total (approximately 20 minutes A1 reading time)

EXPANSION FOCUS - Expand these key emotional moments with more detail:
1. Childhood loneliness - add more specific examples of feeling like an outsider
2. University belonging - expand the joy and connection he felt
3. Post-graduation drift - add more detail about friends moving away
4. COVID isolation - expand the darkest point, add more emotional detail
5. Dating apps failure - expand why they made him feel worse
6. Failed social attempts - add more examples of trying different things
7. First walk breakthrough - expand the moment: what people said, how they felt, the laughter
8. Community growth - add more detail about watching friendships form
9. Mother's goodbye at river - expand this powerful moment with more sensory details
10. Five-day walk - expand the physical struggle and emotional pain
11. Learning of mother's death - expand the grief and community support
12. Storytelling training - expand finding purpose and learning new skills
13. Becoming "voice of the voiceless" - expand the recognition and impact
14. Final reflection - expand the lessons learned and commitment to helping others

EXPANSION TECHNIQUES:
- Add more dialogue (easier for A1 learners to understand)
- Include sensory details (what Nathan saw, heard, felt)
- Expand emotional moments with simple, clear language
- Add more examples of actions taken
- Include more interactions between characters
- Expand scenes with more specific details
- Add more moments showing persistence and courage

CURRENT STORY:
${currentStory}

Expand the story by adding detail, emotion, dialogue, and scenes while keeping ALL existing content. Maintain A1 level language (short sentences max 12 words, simple words, basic grammar). Return ONLY the expanded story text, no explanations.`;

  try {
    console.log('\n🤖 Sending to OpenAI for expansion...');
    console.log('⏳ This may take 30-60 seconds...\n');

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a skilled storyteller expanding narratives for A1 level ESL learners. You preserve all existing content while adding detail, emotion, dialogue, and scenes to reach the target length. Your writing is simple, clear, and appropriate for A1 level learners (short sentences max 12 words, simple words, basic grammar).',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
    });
    
    let expandedStory = response.choices[0].message.content.trim();
    
    // Remove markdown code blocks if present
    if (expandedStory.startsWith('```')) {
      expandedStory = expandedStory.replace(/```[a-z]*\n?/g, '').replace(/```\s*$/g, '').trim();
    }

    // Clean markdown formatting
    expandedStory = expandedStory
      .replace(/\*\*([^*]+)\*\*/g, '$1')  // Remove bold
      .replace(/\*([^*]+)\*/g, '$1')      // Remove italic
      .replace(/__([^_]+)__/g, '$1')      // Remove underline
      .replace(/_([^_]+)_/g, '$1')        // Remove italic underline
      .replace(/^#{1,6}\s+/gm, '')        // Remove headings
      .replace(/`([^`]+)`/g, '$1')        // Remove code formatting
      .trim();
    
    // Save expanded story (overwrite the simplified file)
    fs.writeFileSync(storyFile, expandedStory, 'utf-8');
    
    const wordCount = expandedStory.split(/\s+/).length;
    const sentences = expandedStory.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const sentenceCount = sentences.length;
    const avgWordsPerSentence = (wordCount / sentenceCount).toFixed(1);
    const maxSentenceLength = Math.max(...sentences.map(s => s.trim().split(/\s+/).length));
    const sentencesOver12 = sentences.filter(s => s.trim().split(/\s+/).length > 12).length;
    const estimatedMinutes = Math.round(wordCount / 80); // A1 reading speed ~80 words/min
    
    console.log(`✅ Story expanded and saved`);
    console.log(`📊 New Statistics:`);
    console.log(`   - Words: ${wordCount.toLocaleString()}`);
    console.log(`   - Sentences: ${sentenceCount}`);
    console.log(`   - Avg words per sentence: ${avgWordsPerSentence}`);
    console.log(`   - Max sentence length: ${maxSentenceLength} words`);
    console.log(`   - Sentences over 12 words: ${sentencesOver12}`);
    console.log(`   - Estimated reading time: ~${estimatedMinutes} minutes (A1 level)`);
    
    if (estimatedMinutes < 20) {
      console.log(`\n⚠️  Warning: Target is 20 minutes minimum. Current: ${estimatedMinutes} minutes`);
      console.log(`   May need another expansion pass.`);
    } else {
      console.log(`\n✅ Target met: ${estimatedMinutes} minutes (≥20 minutes)`);
    }
    
    if (parseFloat(avgWordsPerSentence) > 12) {
      console.log(`\n⚠️  Warning: A1 target is max 12 words per sentence. Current average: ${avgWordsPerSentence}`);
    }
    
    if (sentencesOver12 > 0) {
      console.log(`\n⚠️  Warning: ${sentencesOver12} sentences exceed 12-word limit`);
      console.log(`   These may need manual adjustment for perfect A1 compliance.`);
    }
    
    return expandedStory;
  } catch (error) {
    console.error('❌ Error expanding story:', error.message);
    throw error;
  }
}

if (require.main === module) {
  expandStory().catch(console.error);
}

module.exports = { expandStory };

