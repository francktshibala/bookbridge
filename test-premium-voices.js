import { config } from 'dotenv';
import fs from 'fs';

// Load environment variables
config({ path: '.env.local' });

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;

// Premium voices to test
const PREMIUM_VOICES = {
  // Male voices
  'Daniel': 'onwK4e9ZLuTAKqWW03F9',
  'Adam': 'pNInz6obpgDQGcFmaJgB',
  'Josh': 'TxGEqnHWrfWFTfGW9XjX',

  // Female voices
  'Rachel': '21m00Tcm4TlvDq8ikWAM',
  'Domi': 'AZnzlk1XvdvUeBnXmlld',
  'Elli': 'MF3mGyEYCl7XYWbV9V6O'
};

// Sample text from "The Gift of the Magi"
const SAMPLE_TEXT = "One dollar and eighty-seven cents. That was all. And sixty cents of it was in pennies. Pennies saved one and two at a time by bulldozing the grocer and the vegetable man and the butcher until one's cheeks burned with the silent imputation of parsimony that such close dealing implied.";

async function generateVoiceSample(voiceName, voiceId) {
  console.log(`🎙️ Generating sample for ${voiceName}...`);

  try {
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': ELEVENLABS_API_KEY
      },
      body: JSON.stringify({
        text: SAMPLE_TEXT,
        model_id: 'eleven_monolingual_v1',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.0,
          use_speaker_boost: true
        }
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const audioBuffer = await response.arrayBuffer();
    const filename = `voice-sample-${voiceName.toLowerCase()}.mp3`;

    fs.writeFileSync(filename, Buffer.from(audioBuffer));
    console.log(`✅ Generated: ${filename}`);

    return filename;
  } catch (error) {
    console.error(`❌ Failed to generate ${voiceName}:`, error.message);
    return null;
  }
}

async function generateAllVoiceSamples() {
  console.log('🎵 Generating voice samples for The Gift of the Magi...\n');

  const generatedFiles = [];

  for (const [voiceName, voiceId] of Object.entries(PREMIUM_VOICES)) {
    const filename = await generateVoiceSample(voiceName, voiceId);
    if (filename) {
      generatedFiles.push(filename);
    }

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('\n🎧 Voice samples generated! Listen to each file:');
  generatedFiles.forEach(file => {
    console.log(`   ${file}`);
  });

  console.log('\n💡 After listening, tell me which voice you prefer for "The Gift of the Magi"');
}

generateAllVoiceSamples().catch(console.error);