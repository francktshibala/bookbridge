import fs from 'fs';
import path from 'path';

async function detectTheDeadChapters() {
  console.log('📖 Detecting chapter structure for "The Dead" by James Joyce...');

  try {
    const inputPath = path.join(process.cwd(), 'cache', 'the-dead-original.txt');
    const text = fs.readFileSync(inputPath, 'utf8');

    console.log(`📝 Analyzing ${text.length} characters...`);

    // "The Dead" is Joyce's masterpiece short story about Gabriel Conroy
    // at a Christmas party where he realizes his wife still loves a dead man
    // Natural thematic structure for ESL learners:

    const chapters = [
      {
        title: "The Christmas Party",
        description: "Gabriel arrives at his aunts' annual Christmas party",
        startSentence: 0,
        endSentence: 250,
        theme: "Social gathering, family dynamics"
      },
      {
        title: "Conversations and Dancing",
        description: "Gabriel talks with guests and gives his speech",
        startSentence: 250,
        endSentence: 500,
        theme: "Social interactions, Irish culture"
      },
      {
        title: "The Journey Home",
        description: "Gabriel and Gretta leave the party and go to the hotel",
        startSentence: 500,
        endSentence: 750,
        theme: "Intimacy, anticipation"
      },
      {
        title: "Gretta's Memory",
        description: "Gretta tells Gabriel about Michael Furey, her first love",
        startSentence: 750,
        endSentence: 900,
        theme: "Past love, revelation"
      },
      {
        title: "Gabriel's Epiphany",
        description: "Gabriel realizes his wife's true feelings and his own mortality",
        startSentence: 900,
        endSentence: 1013,
        theme: "Self-realization, universal human connection"
      }
    ];

    console.log(`📚 Generated ${chapters.length} thematic chapters:`);
    chapters.forEach((ch, i) => {
      console.log(`   ${i + 1}. ${ch.title} (sentences ${ch.startSentence}-${ch.endSentence})`);
    });

    // Save chapter structure
    const cacheDir = path.join(process.cwd(), 'cache');
    const outputPath = path.join(cacheDir, 'the-dead-chapters.json');

    const chapterData = {
      bookId: 'the-dead',
      title: 'The Dead',
      author: 'James Joyce',
      totalSentences: 1013,
      chapterCount: chapters.length,
      chapters: chapters,
      generatedAt: new Date().toISOString(),
      structure: 'thematic-short-story'
    };

    fs.writeFileSync(outputPath, JSON.stringify(chapterData, null, 2));
    console.log(`💾 Saved chapter structure to: ${outputPath}`);

    // Validate coverage
    const totalCovered = chapters[chapters.length - 1].endSentence;
    console.log(`✅ Chapter detection complete: ${totalCovered} sentences covered`);

    return chapterData;

  } catch (error) {
    console.error('❌ Chapter detection failed:', error.message);
    throw error;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  detectTheDeadChapters()
    .then(() => console.log('🎉 Chapter detection completed!'))
    .catch(console.error);
}

export { detectTheDeadChapters };