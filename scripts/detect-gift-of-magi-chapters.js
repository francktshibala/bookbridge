import fs from 'fs';
import path from 'path';
import OpenAI from 'openai';
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const BOOK_ID = 'gift-of-the-magi';

class ChapterDetector {
  constructor() {
    this.bookId = BOOK_ID;
    this.literaryForm = 'short-story'; // Christmas story, psychological progression
  }

  // Pass 1: Heuristics Detection
  detectExplicitMarkers(text) {
    console.log('🔍 Pass 1: Detecting explicit structural markers...');

    const chapterMarkers = [
      /^CHAPTER [IVXLCDM]+\.?\s*$/gim,     // Roman numerals
      /^CHAPTER \d+\.?\s*$/gim,            // Arabic numerals
      /^CHAPTER [A-Z]+\.?\s*$/gim,         // Word numbers
      /^ACT [IVXLCDM]+/gim,                 // Play acts
      /^SCENE [IVXLCDM]+/gim,               // Play scenes
      /^[A-Z\s]{10,}$/gm,                  // All-caps lines
      /^\*\*\*+\s*$/gm,                    // Separator lines
    ];

    const matches = [];
    chapterMarkers.forEach(regex => {
      const found = text.match(regex) || [];
      matches.push(...found);
    });

    console.log(`   Found ${matches.length} explicit markers:`, matches.slice(0, 5));
    return matches;
  }

  // Pass 2: AI Scene Change Detection
  async detectSceneChanges(text) {
    console.log('🤖 Pass 2: AI scene change detection...');

    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
    console.log(`   Analyzing ${sentences.length} sentences for natural breaks`);

    const sceneChangePrompt = `
Analyze this Christmas short story "The Gift of the Magi" by O. Henry for natural chapter breaks.

Look for:
- Time jumps ("The next morning", "Later that evening", "Meanwhile")
- Location changes (Della's apartment, Jim arriving home, different rooms)
- Character focus shifts (Della's perspective to Jim's perspective)
- Narrative tension drops (end of conflict, resolution moments)
- Emotional turning points (despair → hope, sacrifice → revelation)

The story follows this general structure:
1. Opening situation/problem
2. Della's dilemma and decision
3. Della's journey and purchase
4. Jim's arrival and revelation
5. Final wisdom/resolution

Return 4-6 natural break points as sentence indices (0-based) with confidence scores (0-100).
Target: 5-6 thematic sections for this ~${sentences.length} sentence story.
Era: Early 1900s American, simple prose style.

Text to analyze:
${text.substring(0, 3000)}... [${Math.floor(text.length/1000)}k characters total]

Format response as JSON:
{
  "breaks": [
    {"sentenceIndex": 25, "confidence": 95, "reason": "Della's decision made, transitions to action"},
    {"sentenceIndex": 67, "confidence": 88, "reason": "Location change to barbershop/jewelry shop"}
  ],
  "suggestedChapterCount": 5
}`;

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'user', content: sceneChangePrompt }],
        temperature: 0.3,
        max_tokens: 800
      });

      const aiResponse = response.choices[0].message.content;
      console.log('   Raw AI response:', aiResponse.substring(0, 200) + '...');

      // Try to parse JSON response
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const analysis = JSON.parse(jsonMatch[0]);
        console.log(`   AI suggests ${analysis.breaks.length} break points`);
        return analysis;
      } else {
        console.log('   ⚠️ Could not parse AI response, using fallback');
        return { breaks: [], suggestedChapterCount: 5 };
      }

    } catch (error) {
      console.error('   ❌ AI scene detection failed:', error.message);
      return { breaks: [], suggestedChapterCount: 5 };
    }
  }

  // Pass 3: Form-Aware Processing & Title Generation
  async generateThematicChapters(text, sceneAnalysis) {
    console.log('🎨 Pass 3: Form-aware processing for short story...');

    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
    const totalSentences = sentences.length;

    // For short story: create 5-6 psychological/thematic beats
    const targetChapters = Math.min(6, Math.max(4, sceneAnalysis.suggestedChapterCount || 5));

    // Combine AI suggestions with equal distribution fallback
    let breakPoints = sceneAnalysis.breaks
      .filter(b => b.confidence >= 70)
      .map(b => b.sentenceIndex)
      .sort((a, b) => a - b);

    // Fill gaps with equal distribution if we don't have enough breaks
    if (breakPoints.length < targetChapters - 1) {
      console.log(`   Filling gaps: have ${breakPoints.length} breaks, need ${targetChapters - 1}`);
      const equalDistribution = [];
      for (let i = 1; i < targetChapters; i++) {
        const suggestedIndex = Math.floor((totalSentences * i) / targetChapters);
        equalDistribution.push(suggestedIndex);
      }

      // Merge AI breaks with distribution breaks
      breakPoints = [...new Set([...breakPoints, ...equalDistribution])].sort((a, b) => a - b);
    }

    // Ensure we have exactly targetChapters chapters
    breakPoints = breakPoints.slice(0, targetChapters - 1);

    // Create chapters with start/end sentence indices
    const chapters = [];
    let startSentence = 0;

    for (let i = 0; i < targetChapters; i++) {
      const endSentence = i < breakPoints.length ? breakPoints[i] - 1 : totalSentences - 1;
      const chapterSentences = sentences.slice(startSentence, endSentence + 1);

      chapters.push({
        chapterIndex: i,
        startSentence,
        endSentence,
        sentences: chapterSentences,
        wordCount: chapterSentences.join(' ').split(/\\s+/).length
      });

      startSentence = endSentence + 1;
    }

    // Generate Victorian-era appropriate titles
    console.log(`   Generating titles for ${chapters.length} chapters...`);

    for (const chapter of chapters) {
      const chapterText = chapter.sentences.join(' ').substring(0, 500);
      chapter.title = await this.generateChapterTitle(chapterText, chapter.chapterIndex);
      chapter.confidence = 85; // Base confidence for thematic chapters
    }

    return chapters;
  }

  async generateChapterTitle(chapterText, chapterIndex) {
    const titlePrompt = `
Generate a chapter title for this section of "The Gift of the Magi" by O. Henry:

Text excerpt: "${chapterText.substring(0, 300)}..."

Guidelines:
- Style: Early 1900s American, warm and engaging
- Length: 4-6 words maximum
- Tone: Neutral, no spoilers, gentle
- Examples: "The Christmas Dilemma", "A Sacrifice of Love", "The Precious Gift"
- Avoid: modern slang, emotional extremes, plot reveals
- Focus: situation, emotion, or action (not outcomes)

Chapter ${chapterIndex + 1} title (just the title, no quotes):`;

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'user', content: titlePrompt }],
        temperature: 0.4,
        max_tokens: 20
      });

      let title = response.choices[0].message.content.trim();

      // Clean up the title
      title = title.replace(/^["']|["']$/g, ''); // Remove quotes
      title = title.replace(/^Chapter \\d+:?\\s*/i, ''); // Remove chapter prefix

      // Fallback titles if AI fails
      if (!title || title.length < 3) {
        const fallbackTitles = [
          'The Christmas Eve',
          'A Loving Heart',
          'The Perfect Gift',
          'True Generosity',
          'The Wise Ones',
          'Christmas Magic'
        ];
        title = fallbackTitles[chapterIndex] || `Chapter ${chapterIndex + 1}`;
      }

      console.log(`     Chapter ${chapterIndex + 1}: "${title}"`);
      return title;

    } catch (error) {
      console.error(`   ❌ Title generation failed for chapter ${chapterIndex + 1}:`, error.message);
      return `Chapter ${chapterIndex + 1}`;
    }
  }

  // Quality Validation
  validateChapters(chapters, totalSentences) {
    console.log('✅ Validating chapter quality...');

    const issues = [];

    // Coverage check
    const assignedSentences = chapters.reduce((sum, ch) => sum + (ch.endSentence - ch.startSentence + 1), 0);
    if (assignedSentences !== totalSentences) {
      issues.push(`Coverage issue: ${assignedSentences}/${totalSentences} sentences assigned`);
    }

    // Balance check
    chapters.forEach((chapter, i) => {
      if (chapter.wordCount < 50) issues.push(`Chapter ${i + 1} too short (${chapter.wordCount} words)`);
      if (chapter.wordCount > 800) issues.push(`Chapter ${i + 1} too long (${chapter.wordCount} words)`);
      if (chapter.title.length > 40) issues.push(`Chapter ${i + 1} title too long`);
    });

    // Overlap check
    for (let i = 0; i < chapters.length - 1; i++) {
      if (chapters[i].endSentence >= chapters[i + 1].startSentence) {
        issues.push(`Chapter ${i + 1} overlaps with Chapter ${i + 2}`);
      }
    }

    console.log(`   Found ${issues.length} validation issues`);
    if (issues.length > 0) {
      console.log('   Issues:', issues);
    }

    return issues;
  }
}

async function detectGiftOfMagiChapters() {
  console.log('🔍 Detecting chapters for "The Gift of the Magi"...');
  console.log('📖 Following GPT-5 3-pass hybrid detection system\\n');

  try {
    // Load the fetched text
    const textFilePath = path.join(process.cwd(), 'cache', `${BOOK_ID}-original.txt`);

    if (!fs.existsSync(textFilePath)) {
      throw new Error('Text file not found. Run fetch-gift-of-the-magi.js first');
    }

    const text = fs.readFileSync(textFilePath, 'utf8');
    const detector = new ChapterDetector();

    // Execute 3-pass detection
    const explicitMarkers = detector.detectExplicitMarkers(text);
    const sceneAnalysis = await detector.detectSceneChanges(text);
    const chapters = await detector.generateThematicChapters(text, sceneAnalysis);

    // Validate results
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
    const issues = detector.validateChapters(chapters, sentences.length);

    // Save results
    const result = {
      bookId: BOOK_ID,
      title: 'The Gift of the Magi',
      author: 'O. Henry',
      literaryForm: 'short-story',
      detectionMethod: '3-pass-hybrid',
      totalSentences: sentences.length,
      totalWords: text.split(/\\s+/).length,
      chapters: chapters.map(ch => ({
        chapterIndex: ch.chapterIndex,
        title: ch.title,
        startSentence: ch.startSentence,
        endSentence: ch.endSentence,
        sentenceCount: ch.endSentence - ch.startSentence + 1,
        wordCount: ch.wordCount,
        confidence: ch.confidence
      })),
      validationIssues: issues,
      createdAt: new Date().toISOString()
    };

    const outputPath = path.join(process.cwd(), 'cache', `${BOOK_ID}-chapters.json`);
    fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));

    console.log('\\n📊 Chapter Detection Results:');
    console.log(`   📚 Total Sentences: ${result.totalSentences}`);
    console.log(`   📖 Total Words: ${result.totalWords}`);
    console.log(`   📑 Chapters Created: ${result.chapters.length}`);
    console.log(`   ✅ Validation Issues: ${result.validationIssues.length}`);

    console.log('\\n📖 Generated Chapters:');
    result.chapters.forEach(ch => {
      console.log(`   ${ch.chapterIndex + 1}. "${ch.title}" (sentences ${ch.startSentence}-${ch.endSentence}, ${ch.wordCount} words)`);
    });

    console.log(`\\n💾 Saved to: ${outputPath}`);

    return result;

  } catch (error) {
    console.error('❌ Chapter detection failed:', error.message);
    throw error;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  detectGiftOfMagiChapters()
    .then(() => console.log('\\n✅ Chapter detection completed successfully!'))
    .catch(console.error);
}

export { detectGiftOfMagiChapters };