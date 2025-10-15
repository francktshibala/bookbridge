import fs from 'fs';
import path from 'path';
import OpenAI from 'openai';
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const BOOK_ID = 'lady-with-dog';

class ChapterDetector {
  constructor() {
    this.bookId = BOOK_ID;
    this.literaryForm = 'short-story'; // Chekhov psychological realism
  }

  // Pass 1: Heuristics Detection
  detectExplicitMarkers(text) {
    console.log('🔍 Pass 1: Detecting explicit structural markers...');

    const chapterMarkers = [
      /^CHAPTER [IVXLCDM]+\.?\s*$/gim,     // Roman numerals
      /^CHAPTER \d+\.?\s*$/gim,            // Arabic numerals
      /^[IVX]+\.?\s*$/gm,                  // Roman section markers
      /^\d+\.?\s*$/gm,                     // Arabic section markers
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
Analyze this Russian realist short story "The Lady with the Dog" by Anton Chekhov for natural chapter breaks.

Look for:
- Time jumps ("A week had passed", "At home in Moscow", "Three months later")
- Location changes (Yalta resort → Moscow → Anna's town)
- Character emotional shifts (casual affair → growing attachment → true love)
- Narrative structure shifts (meeting → affair → separation → reunion → resolution)
- Psychological turning points (Gurov's emotional evolution)

The story follows this general structure:
1. Meeting in Yalta (vacation setting, initial attraction)
2. The affair develops (emotional complications)
3. Separation (she leaves, he returns to Moscow)
4. Growing realization (he can't forget her)
5. Reunion and resolution (true love acknowledged)

Return 4-6 natural break points as sentence indices (0-based) with confidence scores (0-100).
Target: 5-6 thematic sections for this ~${sentences.length} sentence story.
Era: 1890s Russian realism, psychological depth.

Text to analyze:
${text.substring(0, 3000)}... [${Math.floor(text.length/1000)}k characters total]

Format response as JSON:
{
  "breaks": [
    {"sentenceIndex": 45, "confidence": 95, "reason": "End of initial meeting, affair begins"},
    {"sentenceIndex": 120, "confidence": 88, "reason": "Anna leaves Yalta, separation begins"}
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

    // For Chekhov story: create 5-6 psychological/thematic beats
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
        wordCount: chapterSentences.join(' ').split(/\s+/).length
      });

      startSentence = endSentence + 1;
    }

    // Generate thematic titles
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
Generate a chapter title for this section of "The Lady with the Dog" by Anton Chekhov:

Text excerpt: "${chapterText.substring(0, 300)}..."

Guidelines:
- Style: Russian realist tradition, understated and elegant
- Length: 4-6 words maximum
- Tone: Neutral, no spoilers, sophisticated
- Examples: "The Meeting", "The Affair", "A Growing Attachment", "The Realization", "True Love"
- Avoid: modern slang, emotional extremes, plot reveals
- Focus: psychological state, situation, or emotional progression

This is Chapter ${chapterIndex + 1} of a 5-6 part structure following Gurov's emotional journey.

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
      title = title.replace(/^Chapter \d+:?\s*/i, ''); // Remove chapter prefix

      // Fallback titles if AI fails
      if (!title || title.length < 3) {
        const fallbackTitles = [
          'The Meeting',
          'The Affair',
          'The Separation',
          'Growing Attachment',
          'The Realization',
          'True Love'
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
      if (chapter.wordCount < 200) issues.push(`Chapter ${i + 1} too short (${chapter.wordCount} words)`);
      if (chapter.wordCount > 2000) issues.push(`Chapter ${i + 1} too long (${chapter.wordCount} words)`);
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

async function detectLadyWithDogChapters() {
  console.log('🔍 Detecting chapters for "The Lady with the Dog"...');
  console.log('📖 Following GPT-5 3-pass hybrid detection system\n');

  try {
    // Load the modernized text (more reliable than original)
    const textFilePath = path.join(process.cwd(), 'cache', `${BOOK_ID}-modernized.txt`);

    if (!fs.existsSync(textFilePath)) {
      throw new Error('Modernized text file not found. Run modernize-lady-with-dog.js first');
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
      title: 'The Lady with the Dog',
      author: 'Anton Chekhov',
      literaryForm: 'short-story',
      detectionMethod: '3-pass-hybrid',
      totalSentences: sentences.length,
      totalWords: text.split(/\s+/).length,
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

    console.log('\n📊 Chapter Detection Results:');
    console.log(`   📚 Total Sentences: ${result.totalSentences}`);
    console.log(`   📖 Total Words: ${result.totalWords}`);
    console.log(`   📑 Chapters Created: ${result.chapters.length}`);
    console.log(`   ✅ Validation Issues: ${result.validationIssues.length}`);

    console.log('\n📖 Generated Chapters:');
    result.chapters.forEach(ch => {
      console.log(`   ${ch.chapterIndex + 1}. "${ch.title}" (sentences ${ch.startSentence}-${ch.endSentence}, ${ch.wordCount} words)`);
    });

    console.log(`\n💾 Saved to: ${outputPath}`);

    return result;

  } catch (error) {
    console.error('❌ Chapter detection failed:', error.message);
    throw error;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  detectLadyWithDogChapters()
    .then(() => console.log('\n✅ Chapter detection completed successfully!'))
    .catch(console.error);
}

export { detectLadyWithDogChapters };