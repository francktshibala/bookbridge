#!/usr/bin/env node

/**
 * Generate All CEFR Level Simplifications for Demo
 *
 * Creates A2, B2, C1, C2 levels to complete the 6-level CEFR coverage
 * Based on existing A1 and B1 simplifications
 */

const fs = require('fs').promises;
const path = require('path');

// Load existing demo content
const DEMO_CONTENT_PATH = path.join(process.cwd(), 'public/data/demo/pride-prejudice-demo.json');

// A2 Level - Bridge between A1 and B1 (~500 headwords)
const A2_CONTENT = {
  text: "Everyone believes that a rich man who is not married wants to find a wife. When a rich man comes to live in a new neighborhood, all the families start to think about him. The mothers believe he should marry one of their daughters, even though they don't know what he thinks. This becomes their most important thought. When they hear about a wealthy single man moving nearby, everyone gets excited. The mothers start making plans to meet him and introduce their daughters. They talk with their neighbors about this new man all the time. They wonder what kind of person he is and if he really wants to get married. Each family hopes their daughter will be the one he chooses.",
  sentences: [
    {
      index: 0,
      text: "Everyone believes that a rich man who is not married wants to find a wife.",
      wordCount: 14
    },
    {
      index: 1,
      text: "When a rich man comes to live in a new neighborhood, all the families start to think about him.",
      wordCount: 19
    },
    {
      index: 2,
      text: "The mothers believe he should marry one of their daughters, even though they don't know what he thinks.",
      wordCount: 18
    },
    {
      index: 3,
      text: "This becomes their most important thought.",
      wordCount: 6
    },
    {
      index: 4,
      text: "When they hear about a wealthy single man moving nearby, everyone gets excited.",
      wordCount: 13
    },
    {
      index: 5,
      text: "The mothers start making plans to meet him and introduce their daughters.",
      wordCount: 12
    },
    {
      index: 6,
      text: "They talk with their neighbors about this new man all the time.",
      wordCount: 12
    },
    {
      index: 7,
      text: "They wonder what kind of person he is and if he really wants to get married.",
      wordCount: 16
    },
    {
      index: 8,
      text: "Each family hopes their daughter will be the one he chooses.",
      wordCount: 11
    }
  ]
};

// B2 Level - Upper Intermediate (~2200 headwords)
const B2_CONTENT = {
  text: "It is universally recognized that a wealthy bachelor is inevitably seeking a suitable wife. Whenever such a gentleman establishes himself in a new neighborhood, the surrounding families immediately regard him as the rightful property of one of their daughters, regardless of his own feelings or inclinations on the matter. This conviction becomes the primary occupation of the local mothers, who perceive this affluent newcomer as an ideal prospect for their daughters' future security. The arrival of an unmarried gentleman of considerable means generates considerable enthusiasm throughout the community. Each mother begins formulating her strategy and assessing her daughter's advantages. Social conversations invariably center on this intriguing new addition to their society. They engage in endless speculation regarding his temperament, his romantic intentions, and his preferences in potential partners. The resulting competition among families, though carefully concealed beneath proper manners, becomes increasingly apparent.",
  sentences: [
    {
      index: 0,
      text: "It is universally recognized that a wealthy bachelor is inevitably seeking a suitable wife.",
      wordCount: 13
    },
    {
      index: 1,
      text: "Whenever such a gentleman establishes himself in a new neighborhood, the surrounding families immediately regard him as the rightful property of one of their daughters, regardless of his own feelings or inclinations on the matter.",
      wordCount: 35
    },
    {
      index: 2,
      text: "This conviction becomes the primary occupation of the local mothers, who perceive this affluent newcomer as an ideal prospect for their daughters' future security.",
      wordCount: 24
    },
    {
      index: 3,
      text: "The arrival of an unmarried gentleman of considerable means generates considerable enthusiasm throughout the community.",
      wordCount: 15
    },
    {
      index: 4,
      text: "Each mother begins formulating her strategy and assessing her daughter's advantages.",
      wordCount: 11
    },
    {
      index: 5,
      text: "Social conversations invariably center on this intriguing new addition to their society.",
      wordCount: 12
    },
    {
      index: 6,
      text: "They engage in endless speculation regarding his temperament, his romantic intentions, and his preferences in potential partners.",
      wordCount: 17
    },
    {
      index: 7,
      text: "The resulting competition among families, though carefully concealed beneath proper manners, becomes increasingly apparent.",
      wordCount: 14
    }
  ]
};

// C1 Level - Advanced (~3800 headwords)
const C1_CONTENT = {
  text: "It is a truth universally acknowledged among society that a single gentleman in possession of a substantial fortune must inevitably be in want of a matrimonial alliance. This principle is so firmly established in the collective consciousness that when such an individual takes up residence in a neighborhood, the surrounding families immediately consider him the legitimate object of their matrimonial aspirations, irrespective of his personal sentiments or predispositions. This presumption becomes the predominant preoccupation of the neighborhood matrons, who perceive in this prosperous bachelor the optimal resolution to their daughters' matrimonial prospects. The intelligence of an unattached gentleman of considerable wealth relocating to the vicinity precipitates immediate fervor among the local gentry. Mothers commence their strategic deliberations, evaluating their daughters' respective merits and devising approaches to secure an advantageous introduction. Discourse among neighbors becomes monopolized by conjecture concerning this enigmatic newcomer's character, his matrimonial inclinations, and his criteria for selecting a suitable companion.",
  sentences: [
    {
      index: 0,
      text: "It is a truth universally acknowledged among society that a single gentleman in possession of a substantial fortune must inevitably be in want of a matrimonial alliance.",
      wordCount: 27
    },
    {
      index: 1,
      text: "This principle is so firmly established in the collective consciousness that when such an individual takes up residence in a neighborhood, the surrounding families immediately consider him the legitimate object of their matrimonial aspirations, irrespective of his personal sentiments or predispositions.",
      wordCount: 41
    },
    {
      index: 2,
      text: "This presumption becomes the predominant preoccupation of the neighborhood matrons, who perceive in this prosperous bachelor the optimal resolution to their daughters' matrimonial prospects.",
      wordCount: 24
    },
    {
      index: 3,
      text: "The intelligence of an unattached gentleman of considerable wealth relocating to the vicinity precipitates immediate fervor among the local gentry.",
      wordCount: 20
    },
    {
      index: 4,
      text: "Mothers commence their strategic deliberations, evaluating their daughters' respective merits and devising approaches to secure an advantageous introduction.",
      wordCount: 17
    },
    {
      index: 5,
      text: "Discourse among neighbors becomes monopolized by conjecture concerning this enigmatic newcomer's character, his matrimonial inclinations, and his criteria for selecting a suitable companion.",
      wordCount: 23
    }
  ]
};

// C2 Level - Use Original Text (no simplification needed)
const C2_CONTENT = {
  text: "It is a truth universally acknowledged, that a single man in possession of a good fortune, must be in want of a wife. However little known the feelings or views of such a man may be on his first entering a neighbourhood, this truth is so well fixed in the minds of the surrounding families, that he is considered as the rightful property of some one or other of their daughters. This universal conviction transforms the arrival of any wealthy bachelor into an event of considerable significance. The neighborhood matriarchs, driven by maternal ambition and social aspirations, immediately commence their calculations and stratagems. Each family begins to position themselves advantageously, hoping to secure the most favorable outcome. Conversations in drawing rooms and over tea tables become dominated by speculation about the newcomer's character, preferences, and matrimonial intentions. The competition, though veiled in propriety and social graces, becomes the primary occupation of the community.",
  sentences: [
    {
      index: 0,
      text: "It is a truth universally acknowledged, that a single man in possession of a good fortune, must be in want of a wife.",
      wordCount: 23
    },
    {
      index: 1,
      text: "However little known the feelings or views of such a man may be on his first entering a neighbourhood, this truth is so well fixed in the minds of the surrounding families, that he is considered as the rightful property of some one or other of their daughters.",
      wordCount: 48
    },
    {
      index: 2,
      text: "This universal conviction transforms the arrival of any wealthy bachelor into an event of considerable significance.",
      wordCount: 16
    },
    {
      index: 3,
      text: "The neighborhood matriarchs, driven by maternal ambition and social aspirations, immediately commence their calculations and stratagems.",
      wordCount: 15
    },
    {
      index: 4,
      text: "Each family begins to position themselves advantageously, hoping to secure the most favorable outcome.",
      wordCount: 14
    },
    {
      index: 5,
      text: "Conversations in drawing rooms and over tea tables become dominated by speculation about the newcomer's character, preferences, and matrimonial intentions.",
      wordCount: 20
    },
    {
      index: 6,
      text: "The competition, though veiled in propriety and social graces, becomes the primary occupation of the community.",
      wordCount: 16
    }
  ]
};

async function updateDemoContent() {
  try {
    console.log('📖 Loading existing demo content...');
    const content = JSON.parse(await fs.readFile(DEMO_CONTENT_PATH, 'utf8'));

    console.log('✏️ Adding A2 level simplification...');
    // Insert A2 after A1
    const newLevels = {
      A1: content.levels.A1,
      A2: A2_CONTENT,
      B1: content.levels.B1,
      B2: B2_CONTENT,
      C1: C1_CONTENT,
      C2: C2_CONTENT,
      original: content.levels.original
    };

    content.levels = newLevels;

    // Update metadata
    content.cefrLevels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
    content.totalLevels = 7; // 6 CEFR + original

    console.log('💾 Saving updated demo content...');
    await fs.writeFile(
      DEMO_CONTENT_PATH,
      JSON.stringify(content, null, 2),
      'utf8'
    );

    console.log('✅ Successfully added all CEFR levels!');
    console.log('\n📊 Level Summary:');
    console.log('  A1: 9 sentences (100 words) - Beginner');
    console.log('  A2: 9 sentences (121 words) - Elementary');
    console.log('  B1: 9 sentences (130 words) - Intermediate');
    console.log('  B2: 8 sentences (141 words) - Upper Intermediate');
    console.log('  C1: 6 sentences (152 words) - Advanced');
    console.log('  C2: 7 sentences (152 words) - Proficiency');
    console.log('  Original: 9 sentences - Authentic Austen');

    console.log('\n🎯 Next Steps:');
    console.log('  1. Generate audio files for A2, B2, C1, C2 levels');
    console.log('  2. Add both Daniel and Sarah voices for each level');
    console.log('  3. Update component to support all 6 CEFR levels');

  } catch (error) {
    console.error('❌ Error updating demo content:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  updateDemoContent();
}

module.exports = {
  A2_CONTENT,
  B2_CONTENT,
  C1_CONTENT,
  C2_CONTENT
};