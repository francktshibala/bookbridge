import fs from 'fs';
import path from 'path';

const BOOK_INFO = {
  id: 'story-of-an-hour',
  title: 'The Story of an Hour',
  author: 'Kate Chopin',
  // Using direct public domain text source (very short story ~1000 words)
  directTextUrl: 'https://www.gutenberg.org/cache/epub/160/pg160-images.html',
  // Fallback: Known public domain text
  fallbackText: `Knowing that Mrs. Mallard was afflicted with a heart trouble, great care was taken to break to her as gently as possible the news of her husband's death.

It was her sister Josephine who told her, in broken sentences; veiled hints that revealed in half concealing. Her husband's friend Richards was there, too, near her. It was he who had been in the newspaper office when intelligence of the railroad disaster was received, with Brently Mallard's name leading the list of "killed." He had only taken the time to assure himself of its truth by a second telegram, and had hastened to forestall any less careful, less tender friend in bearing the sad message.

She did not hear the story as many women have heard the same, with a paralyzed inability to accept its significance. She wept at once, with sudden, wild abandonment, in her sister's arms. When the storm of grief had spent itself she went away to her room alone. She would have no one follow her.

There stood, facing the open window, a comfortable, roomy armchair. Into this she sank, pressed down by a physical exhaustion that haunted her body and seemed to reach into her soul.

She could see in the open square before her house the tops of trees that were all aquiver with the new spring life. The delicious breath of rain was in the air. In the street below a peddler was crying his wares. The notes of a distant song which some one was singing reached her faintly, and countless sparrows were twittering in the eaves.

There were patches of blue sky showing here and there through the clouds that had met and piled one above the other in the west facing her window.

She sat with her head thrown back upon the cushion of the chair, quite motionless, except when a sob came up into her throat and shook her, as a child who has cried itself to sleep continues to sob in its dreams.

She was young, with a fair, calm face, whose lines bespoke repression and even a certain strength. But now there was a dull stare in her eyes, whose gaze was fixed away off yonder on one of those patches of blue sky. It was not a glance of reflection, but rather indicated a suspension of intelligent thought.

There was something coming to her and she was waiting for it, fearfully. What was it? She did not know; it was too subtle and elusive to name. But she felt it, creeping out of the sky, reaching toward her through the sounds, the scents, the color that filled the air.

Now her bosom rose and fell tumultuously. She was beginning to recognize this thing that was approaching to possess her, and she was striving to beat it back with her will—as powerless as her two white slender hands would have been.

When she abandoned herself a little whispered word escaped her slightly parted lips. She said it over and over under her breath: "free, free, free!" The vacant stare and the look of terror that had followed it went from her eyes. They stayed keen and bright. Her pulses beat fast, and the coursing blood warmed and relaxed every inch of her body.

She did not stop to ask if it were or were not a monstrous joy that held her. A clear and exalted perception enabled her to dismiss the suggestion as trivial.

She knew that she would weep again when she saw the kind, tender hands folded in death; the face that had never looked save with love upon her, fixed and gray and dead. But she saw beyond that bitter moment a long procession of years to come that would belong to her absolutely. And she opened and spread her arms out to them in welcome.

There would be no one to live for during those coming years; she would live for herself. There would be no powerful will bending hers in that blind persistence with which men and women believe they have a right to impose a private will upon a fellow-creature. A kind intention or a cruel intention made the act seem no less a crime as she looked upon it in that brief moment of illumination.

And yet she had loved him—sometimes. Often she had not. What did it matter! What could love, the unsolved mystery, count for in the face of this possession of self-assertion which she suddenly recognized as the strongest impulse of her being!

"Free! Body and soul free!" she kept whispering.

Josephine was kneeling before the closed door with her lips to the keyhole, imploring for admission. "Louise, open the door! I beg; open the door—you will make yourself ill. What are you doing, Louise? For heaven's sake open the door."

"Go away. I am not making myself ill." No; she was drinking in a very elixir of life through that open window.

Her fancy was running riot along those days ahead of her. Spring days, and summer days, and all sorts of days that would be her own. She breathed a quick prayer that life might be long. It was only yesterday she had thought with a shudder that life might be long.

She arose at length and opened the door to her sister's importunities. There was a feverish triumph in her eyes, and she carried herself unwittingly like a goddess of Victory. She clasped her sister's waist, and together they descended the stairs. Richards stood waiting for them at the bottom.

Some one was opening the front door with a latchkey. It was Brently Mallard who entered, a little travel-stained, composedly carrying his grip-sack and umbrella. He had been far from the scene of the accident, and did not even know there had been one. He stood amazed at Josephine's piercing cry; at Richards' quick motion to screen him from the view of his wife.

But Richards was too late.

When the doctors came they said she had died of heart disease—of the joy that kills.`
};

async function fetchStoryOfAnHour() {
  console.log(`📖 Fetching "${BOOK_INFO.title}" by ${BOOK_INFO.author}...`);

  try {
    // Use fallback text directly (public domain, ~1000 words)
    console.log('📄 Using public domain text source...');
    const fullText = BOOK_INFO.fallbackText;
    console.log(`📄 Text length: ${fullText.length} characters`);

    // Text is already extracted and ready to use
    const cleanedText = fullText
      .replace(/\r\n/g, '\n')           // Normalize line endings
      .replace(/\n{3,}/g, '\n\n')       // Reduce multiple newlines
      .replace(/[ \t]+/g, ' ')          // Normalize spaces
      .trim();

    console.log(`✂️ Extracted story: ${cleanedText.length} characters`);

    const cacheDir = path.join(process.cwd(), 'cache');
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }

    const cacheFilePath = path.join(cacheDir, `${BOOK_INFO.id}-original.txt`);
    fs.writeFileSync(cacheFilePath, cleanedText, 'utf8');
    console.log(`💾 Saved to: ${cacheFilePath}`);

    const sentences = cleanedText.match(/[^.!?]*[.!?]/g) || [];
    const words = cleanedText.split(/\s+/).length;
    const paragraphs = cleanedText.split(/\n\n+/).length;

    console.log('📊 Story Statistics:');
    console.log(`   📝 Sentences: ${sentences.length}`);
    console.log(`   📖 Words: ${words}`);
    console.log(`   📄 Paragraphs: ${paragraphs}`);

    console.log('\n📖 Story Preview:');
    sentences.slice(0, 3).forEach((sentence, i) => {
      console.log(`   ${i + 1}. ${sentence.trim().substring(0, 80)}...`);
    });

    console.log('\n✅ Fetch complete!');
    return {
      success: true,
      sentences: sentences.length,
      words: words,
      filePath: cacheFilePath
    };

  } catch (error) {
    console.error('❌ Error fetching story:', error.message);
    throw error;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  fetchStoryOfAnHour()
    .then(() => {
      console.log('\n✅ Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Script failed:', error);
      process.exit(1);
    });
}

export default fetchStoryOfAnHour;

