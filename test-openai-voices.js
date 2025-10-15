import { config } from 'dotenv';
import OpenAI from 'openai';
import fs from 'fs';

config({ path: '.env.local' });

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Test text from your story
const testText = "Maya was a student, but she lived very far from school. She wanted to learn English, and her teacher told her about online classes.";

const voices = ['nova', 'onyx', 'alloy', 'echo', 'shimmer'];

async function generateVoiceSamples() {
  console.log('🎵 Generating OpenAI voice samples...');
  console.log(`📝 Test text: "${testText}"`);

  for (const voice of voices) {
    try {
      console.log(`\n🎙️ Generating sample with voice: ${voice}`);

      const mp3Response = await openai.audio.speech.create({
        model: 'tts-1-hd',
        voice: voice,
        input: testText,
        speed: 0.9 // Slightly slower for clarity
      });

      const audioBuffer = Buffer.from(await mp3Response.arrayBuffer());
      const fileName = `voice-sample-${voice}.mp3`;

      fs.writeFileSync(fileName, audioBuffer);
      console.log(`✅ Saved: ${fileName}`);
      console.log(`🔗 Play: open ${fileName}`);

    } catch (error) {
      console.error(`❌ Error with ${voice}:`, error.message);
    }
  }

  console.log('\n🎉 Voice samples generated!');
  console.log('🎧 Listen to each file to compare quality:');
  voices.forEach(voice => {
    console.log(`   - open voice-sample-${voice}.mp3`);
  });
}

generateVoiceSamples();