import { config } from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load environment variables
config({ path: '.env.local' });

// Popular ElevenLabs voice options with descriptions
const VOICE_OPTIONS = [
  {
    name: 'Daniel',
    id: 'onwK4e9ZLuTAKqWW03F9',
    description: 'British, deep, news presenter voice'
  },
  {
    name: 'Adam',
    id: 'pNInz6obpgDQGcFmaJgB',
    description: 'American, deep, narration voice'
  },
  {
    name: 'Clyde',
    id: '2EiwWnXFnvU5JabPnv8n',
    description: 'American, war veteran, deep voice'
  },
  {
    name: 'Sarah',
    id: 'EXAVITQu4vr4xnSDxMaL',
    description: 'American, soft, news voice'
  }
];

// Alternative British voices you might like
const ALTERNATIVE_BRITISH = [
  {
    name: 'George',
    id: 'JBFqnCBsd6RMkjVDRZzb',
    description: 'British, raspy, deep'
  },
  {
    name: 'Charlie',
    id: 'IKne3meq5aSn9XLyUdCD',
    description: 'Australian, casual, deep'
  },
  {
    name: 'Harry',
    id: 'SOYHLrjzK2X1ezoPC6cr',
    description: 'American, anxious newsreader, deep'
  },
  {
    name: 'James',
    id: 'ZQe5CZNOzWyzPSCn5a3c',
    description: 'Australian, calm, deep'
  }
];

const TEST_TEXT = "The Necklace is a classic story by Guy de Maupassant. It tells the tale of Mathilde Loisel, a woman who borrows a diamond necklace for a ball, loses it, and spends ten years paying for a replacement, only to discover the original was fake.";

async function generateVoiceSample(voiceData, outputDir) {
  console.log(`\n🎤 Generating sample for ${voiceData.name} (${voiceData.description})...`);

  try {
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceData.id}`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': process.env.ELEVENLABS_API_KEY
      },
      body: JSON.stringify({
        text: TEST_TEXT,
        model_id: 'eleven_monolingual_v1',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.0,
          speed: 0.90,
          use_speaker_boost: true
        }
      })
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const audioBuffer = await response.arrayBuffer();
    const outputPath = path.join(outputDir, `${voiceData.name.toLowerCase()}_sample.mp3`);

    fs.writeFileSync(outputPath, Buffer.from(audioBuffer));
    console.log(`   ✅ Saved: ${outputPath}`);
    console.log(`   📝 Voice ID: ${voiceData.id}`);

    return { success: true, path: outputPath };
  } catch (error) {
    console.error(`   ❌ Failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function testVoices() {
  console.log('🎵 ElevenLabs Voice Testing for The Necklace');
  console.log('=' .repeat(50));

  // Create output directory
  const outputDir = path.join(process.cwd(), 'voice-samples');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log('\n📁 Output directory:', outputDir);
  console.log('\n🎯 PRIMARY VOICE OPTIONS:');

  // Test primary voices
  for (const voice of VOICE_OPTIONS) {
    await generateVoiceSample(voice, outputDir);
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('\n🎯 ALTERNATIVE BRITISH/DEEP VOICES:');

  // Test alternative voices if you want more options
  const testAlternatives = process.argv.includes('--all');
  if (testAlternatives) {
    for (const voice of ALTERNATIVE_BRITISH) {
      await generateVoiceSample(voice, outputDir);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  } else {
    console.log('   ℹ️ Run with --all flag to test 4 additional British/deep voices');
    console.log('   Available: George (British raspy), Charlie (Australian deep)');
    console.log('              Harry (newsreader), James (Australian calm)');
  }

  console.log('\n' + '=' .repeat(50));
  console.log('✅ VOICE TESTING COMPLETE!');
  console.log('\n📊 VOICE IDS FOR DOCUMENTATION:');
  console.log('Primary voices tested:');
  VOICE_OPTIONS.forEach(v => {
    console.log(`   ${v.name}: ${v.id} (${v.description})`);
  });

  console.log('\n🎧 Listen to the samples in:', outputDir);
  console.log('📝 Once you pick your favorites, we\'ll document them in the master mistakes file');
  console.log('\n💡 TIP: The "Daniel" voice (onwK4e9ZLuTAKqWW03F9) is British with a deep news presenter style');
  console.log('       You might also like "George" (JBFqnCBsd6RMkjVDRZzb) for a raspier British voice');
}

// Run the test
testVoices().catch(console.error);