/**
 * Generate Test Book for Continuous Reading Validation
 * Uses proper paths and sentence-level audio generation
 */

const { PrismaClient } = require('@prisma/client');
const { createClient } = require('@supabase/supabase-js');
const OpenAI = require('openai');

const prisma = new PrismaClient();

// Initialize APIs
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const claude = require('@anthropic-ai/sdk');
const anthropic = new claude({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Test Book Configuration
const TEST_BOOK = {
  id: 'test-continuous-001', // Book-specific path
  title: 'The Little Adventure',
  author: 'Claude Code Test',
  originalText: `
Chapter 1: The Discovery

Maya walked through the forest near her grandmother's house. The trees were tall and green. She heard a strange sound coming from behind a big oak tree. When she looked, she found a small, glowing crystal.

"What is this?" Maya whispered. The crystal was warm in her hands. It sparkled with blue and purple lights. She had never seen anything like it before.

Chapter 2: The Magic Begins

Maya took the crystal home. In her room, she placed it on her desk. Suddenly, the crystal began to glow brighter. Her books started floating in the air. Her pencils danced around the room.

"This must be magic!" Maya said with excitement. She touched the crystal again. This time, she could hear the thoughts of her cat, Whiskers. "Meow means hello," Whiskers thought.

Chapter 3: Learning Control

The next day, Maya practiced with the crystal. She learned to make small objects move. She made her homework write itself. She even made flowers bloom instantly in her garden.

But Maya realized something important. Magic was powerful, but it was better when used to help others. She decided to use her new abilities to help her friends and family.

Chapter 4: Helping Others

Maya used her magic crystal to help her grandmother with heavy boxes. She helped her friend Tom find his lost dog. She made beautiful drawings appear on the walls of the children's hospital.

Everyone in the town began to notice the wonderful things happening. They didn't know it was Maya's magic, but they felt happier. The town became a more joyful place to live.

Chapter 5: The Choice

One evening, an old wizard appeared at Maya's door. "I see you have found my crystal," he said kindly. "You have used it well. But now you must choose. Keep the magic for yourself, or give it to someone who needs it more."

Maya thought carefully. She looked at the crystal, then at the wizard. "I choose to give it to the children's hospital," she said. "They need magic more than I do." The wizard smiled. "You have learned the most important magic of all - kindness."

The End
`.trim()
};

// CEFR Levels to generate
const CEFR_LEVELS = ['original', 'a2', 'b1'];

class TestBookGenerator {
  async generateSimplification(text, cefrLevel) {
    try {
      if (cefrLevel === 'original') return text;

      const simplificationPrompts = {
        a2: `Simplify this text for A2 English learners. Use simple sentences, basic vocabulary, and present tense. Keep the story engaging but use only common words that A2 students know:`,
        b1: `Simplify this text for B1 English learners. Use clear sentences, familiar vocabulary, and straightforward grammar. The story should remain interesting while being accessible to intermediate students:`
      };

      const prompt = simplificationPrompts[cefrLevel];

      const response = await anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 2000,
        messages: [{
          role: 'user',
          content: `${prompt}

Text to simplify:
${text}

Return only the simplified text, no explanations.`
        }]
      });

      return response.content[0].text.trim();
    } catch (error) {
      console.error(`Failed to simplify for ${cefrLevel}:`, error);
      return text; // Fallback to original
    }
  }

  splitIntoSentences(text) {
    // Split into sentences and clean
    return text
      .split(/[.!?]+/)
      .map(s => s.trim())
      .filter(s => s.length > 0)
      .map(s => s + (s.endsWith('.') || s.endsWith('!') || s.endsWith('?') ? '' : '.'));
  }

  async generateSentenceAudio(sentence, sentenceIndex, bookId, cefrLevel) {
    try {
      console.log(`🎵 Generating audio for sentence ${sentenceIndex} (${cefrLevel})`);

      // CRITICAL: Clean text only (no intro phrases)
      const cleanText = sentence.trim();

      // Book-specific path pattern
      const audioFileName = `${bookId}/${cefrLevel}/sentence_${sentenceIndex}.mp3`;

      // Generate audio with OpenAI
      const audioResponse = await openai.audio.speech.create({
        model: 'tts-1-hd',
        voice: 'alloy',
        input: cleanText, // CLEAN TEXT ONLY - no intro phrases
        speed: 1.0
      });

      // Convert to buffer
      const buffer = Buffer.from(await audioResponse.arrayBuffer());

      // Upload to Supabase storage with book-specific path
      const { data, error } = await supabase.storage
        .from('audio-files')
        .upload(audioFileName, buffer, {
          contentType: 'audio/mpeg',
          upsert: true // Allow overwriting for testing
        });

      if (error) {
        console.error('Upload error:', error);
        throw error;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('audio-files')
        .getPublicUrl(audioFileName);

      console.log(`✅ Audio uploaded: ${audioFileName}`);
      return publicUrl;

    } catch (error) {
      console.error(`Failed to generate audio for sentence ${sentenceIndex}:`, error);
      return null;
    }
  }

  async storeSentenceInDatabase(sentence, sentenceIndex, audioUrl, bookId, cefrLevel) {
    try {
      // Store in audio_assets table (Supabase pattern)
      const { data, error } = await supabase
        .from('audio_assets')
        .insert({
          book_id: bookId,
          cefr_level: cefrLevel,
          chunk_index: 0, // All sentences in chunk 0 for continuous
          sentence_index: sentenceIndex,
          audio_url: audioUrl,
          word_timings: [], // TODO: Generate word timings
          provider: 'openai',
          voice_id: 'alloy',
          created_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString() // 90 days
        });

      if (error) {
        console.error('Database insert error:', error);
        throw error;
      }

      console.log(`✅ Sentence ${sentenceIndex} stored in database`);
      return data;

    } catch (error) {
      console.error(`Failed to store sentence ${sentenceIndex}:`, error);
      return null;
    }
  }

  async generateTestBook() {
    try {
      console.log('🚀 Starting test book generation for continuous reading...');

      // Step 1: Store book content (upsert to handle existing)
      await prisma.bookContent.upsert({
        where: { bookId: TEST_BOOK.id },
        update: {
          title: TEST_BOOK.title,
          author: TEST_BOOK.author,
          fullText: TEST_BOOK.originalText,
          era: 'modern',
          wordCount: TEST_BOOK.originalText.split(' ').length,
          totalChunks: 1
        },
        create: {
          bookId: TEST_BOOK.id,
          title: TEST_BOOK.title,
          author: TEST_BOOK.author,
          fullText: TEST_BOOK.originalText,
          era: 'modern',
          wordCount: TEST_BOOK.originalText.split(' ').length,
          totalChunks: 1 // All content in one "chunk" for continuous
        }
      });

      console.log('✅ Book content stored/updated in database');

      // Step 2: Generate for each CEFR level
      for (const cefrLevel of CEFR_LEVELS) {
        console.log(`\\n📝 Processing CEFR level: ${cefrLevel}`);

        // Get simplified text
        const simplifiedText = await this.generateSimplification(TEST_BOOK.originalText, cefrLevel);

        // Split into sentences
        const sentences = this.splitIntoSentences(simplifiedText);
        console.log(`   Found ${sentences.length} sentences`);

        // Store simplified text (upsert to handle existing)
        if (cefrLevel !== 'original') {
          await prisma.bookSimplification.upsert({
            where: {
              bookId_targetLevel_chunkIndex_versionKey: {
                bookId: TEST_BOOK.id,
                targetLevel: cefrLevel,
                chunkIndex: 0,
                versionKey: 'v1'
              }
            },
            update: {
              originalText: TEST_BOOK.originalText,
              simplifiedText: simplifiedText
            },
            create: {
              bookId: TEST_BOOK.id,
              targetLevel: cefrLevel,
              chunkIndex: 0,
              originalText: TEST_BOOK.originalText,
              simplifiedText: simplifiedText,
              versionKey: 'v1'
            }
          });
        }

        // Generate sentence-level audio
        for (let i = 0; i < sentences.length; i++) {
          const sentence = sentences[i];

          // Generate and upload audio
          const audioUrl = await this.generateSentenceAudio(sentence, i, TEST_BOOK.id, cefrLevel);

          if (audioUrl) {
            // Store in database
            await this.storeSentenceInDatabase(sentence, i, audioUrl, TEST_BOOK.id, cefrLevel);
          }

          // Small delay to avoid rate limits
          await new Promise(resolve => setTimeout(resolve, 500));
        }

        console.log(`✅ ${cefrLevel} level complete: ${sentences.length} sentences`);
      }

      console.log('\\n🎉 Test book generation complete!');
      console.log(`Book ID: ${TEST_BOOK.id}`);
      console.log(`Available levels: ${CEFR_LEVELS.join(', ')}`);
      console.log(`Total sentences per level: ~${this.splitIntoSentences(TEST_BOOK.originalText).length}`);

      return {
        success: true,
        bookId: TEST_BOOK.id,
        levels: CEFR_LEVELS,
        sentenceCount: this.splitIntoSentences(TEST_BOOK.originalText).length
      };

    } catch (error) {
      console.error('❌ Test book generation failed:', error);
      throw error;
    } finally {
      await prisma.$disconnect();
    }
  }
}

// Run if called directly
if (require.main === module) {
  const generator = new TestBookGenerator();
  generator.generateTestBook()
    .then(result => {
      console.log('\\n📊 Generation Result:', result);
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Generation failed:', error);
      process.exit(1);
    });
}

module.exports = TestBookGenerator;