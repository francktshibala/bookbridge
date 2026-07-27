import { config } from 'dotenv';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
config({ path: path.join(__dirname, '..', '.env.local') });

// Voice IDs (from production plan)
const DANIEL_VOICE_ID = 'onwK4e9ZLuTAKqWW03F9'; // Daniel voice (British deep news presenter) - Educational
const JANE_VOICE_ID = 'RILOU7YmBhvwJGDGjNmP'; // Jane voice (Professional audiobook reader) - Stories
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;

if (!ELEVENLABS_API_KEY) {
  console.error('❌ ELEVENLABS_API_KEY not found in .env.local');
  process.exit(1);
}

// Voice settings (from production plan)
const DANIEL_VOICE_SETTINGS = {
  model_id: 'eleven_multilingual_v2',
  voice_settings: {
    stability: 0.45,
    similarity_boost: 0.8,
    style: 0.1,
    use_speaker_boost: true
  }
};

const JANE_VOICE_SETTINGS = {
  model_id: 'eleven_multilingual_v2',
  voice_settings: {
    stability: 0.75,
    similarity_boost: 0.85,
    style: 0.0,
    use_speaker_boost: true
  }
};

// Audio generation settings for each section
const AUDIO_SECTIONS = [
  {
    name: 'hook',
    file: 'he-arrived-20-dream-part1-audio-hook.txt',
    voice: 'daniel',
    speed: 0.90, // Normal speed
    ffmpegSlowdown: false,
    needsPauses: false
  },
  {
    name: 'main-story',
    file: 'he-arrived-20-dream-part1-audio-main-story.txt',
    voice: 'daniel', // Daniel for consistency
    speed: 0.70, // Slow narration (0.70x)
    ffmpegSlowdown: true,
    needsPauses: false
  },
  {
    name: 'vocabulary',
    file: 'he-arrived-20-dream-part1-audio-vocabulary.txt',
    voice: 'daniel',
    speed: 0.90, // Normal speed
    ffmpegSlowdown: false,
    needsPauses: false
  },
  {
    name: 'shadowing',
    file: 'he-arrived-20-dream-part1-audio-shadowing.txt',
    voice: 'daniel', // Daniel for consistency
    speed: 0.70, // Slow for practice
    ffmpegSlowdown: true,
    needsPauses: true, // 5s pauses between sentences
    pauseDuration: 5.0
  },
  {
    name: 'cliffhanger',
    file: 'he-arrived-20-dream-part1-audio-cliffhanger.txt',
    voice: 'daniel',
    speed: 0.90, // Normal speed
    ffmpegSlowdown: false,
    needsPauses: false
  }
];

// Generate silence file
function generateSilence(duration, outputPath) {
  execSync(
    `ffmpeg -f lavfi -i anullsrc=r=44100:cl=mono -t ${duration} -y "${outputPath}"`,
    { stdio: 'ignore' }
  );
}

async function generateAudio(section) {
  console.log(`\n🎵 Generating audio for: ${section.name}`);
  
  // Read script file
  const scriptPath = path.join(__dirname, '..', 'cache', section.file);
  if (!fs.existsSync(scriptPath)) {
    console.error(`❌ Script file not found: ${scriptPath}`);
    return;
  }

  let scriptText = fs.readFileSync(scriptPath, 'utf-8');
  
  // Remove metadata lines (lines starting with **)
  scriptText = scriptText
    .split('\n')
    .filter(line => !line.trim().startsWith('**') && line.trim() !== '')
    .join('\n')
    .trim();

  // Select voice and settings
  const voiceId = section.voice === 'jane' ? JANE_VOICE_ID : DANIEL_VOICE_ID;
  const voiceSettings = section.voice === 'jane' ? JANE_VOICE_SETTINGS : DANIEL_VOICE_SETTINGS;
  const voiceName = section.voice === 'jane' ? 'Jane' : 'Daniel';

  console.log(`   📝 Text length: ${scriptText.length} characters`);
  console.log(`   🗣️ Voice: ${voiceName} (${voiceId})`);
  console.log(`   ⚡ Speed: ${section.speed}x`);

  try {
    const tempDir = path.join(__dirname, '..', 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Handle shadowing with pauses
    if (section.needsPauses) {
      // Split by [PAUSE] markers
      const parts = scriptText.split(/\[PAUSE \d+ SECONDS\]/gi);
      const sentences = parts.filter(p => p.trim()).map(p => p.trim());
      
      console.log(`   📋 Found ${sentences.length} sentences with pauses`);
      
      const audioSegments = [];
      
      // Generate audio for each sentence
      for (let i = 0; i < sentences.length; i++) {
        const sentence = sentences[i];
        console.log(`   🎙️ Generating sentence ${i + 1}/${sentences.length}...`);
        
        const elevenLabsSpeed = section.speed >= 0.85 ? section.speed : 0.85;
        
        const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
          method: 'POST',
          headers: {
            'Accept': 'audio/mpeg',
            'Content-Type': 'application/json',
            'xi-api-key': ELEVENLABS_API_KEY
          },
          body: JSON.stringify({
            text: sentence,
            model_id: voiceSettings.model_id,
            voice_settings: voiceSettings.voice_settings,
            speed: elevenLabsSpeed
          })
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`ElevenLabs API error: ${response.status} ${response.statusText} - ${errorText.substring(0, 200)}`);
        }

        const audioBuffer = await response.arrayBuffer();
        const segmentFile = path.join(tempDir, `part1_${section.name}_seg${i}.mp3`);
        fs.writeFileSync(segmentFile, Buffer.from(audioBuffer));
        audioSegments.push(segmentFile);
        
        // Add pause after each sentence (except last)
        if (i < sentences.length - 1) {
          const pauseFile = path.join(tempDir, `part1_${section.name}_pause${i}.mp3`);
          generateSilence(section.pauseDuration, pauseFile);
          audioSegments.push(pauseFile);
        }
      }
      
      // Concatenate all segments
      const concatListFile = path.join(tempDir, `part1_${section.name}_concat.txt`);
      const concatList = audioSegments.map(f => `file '${f}'`).join('\n');
      fs.writeFileSync(concatListFile, concatList);
      
      const tempFile = path.join(tempDir, `part1_${section.name}_temp.mp3`);
      execSync(
        `ffmpeg -f concat -safe 0 -i "${concatListFile}" -c copy -y "${tempFile}"`,
        { stdio: 'ignore' }
      );
      
      console.log(`   ✅ Concatenated ${audioSegments.length} segments`);
      
      // Clean up segment files
      audioSegments.forEach(f => {
        if (fs.existsSync(f)) fs.unlinkSync(f);
      });
      if (fs.existsSync(concatListFile)) fs.unlinkSync(concatListFile);
      
    } else {
      // Regular generation (no pauses)
      const elevenLabsSpeed = section.speed >= 0.85 ? section.speed : 0.85;
      
      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': ELEVENLABS_API_KEY
        },
        body: JSON.stringify({
          text: scriptText,
          model_id: voiceSettings.model_id,
          voice_settings: voiceSettings.voice_settings,
          speed: elevenLabsSpeed
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`ElevenLabs API error: ${response.status} ${response.statusText} - ${errorText.substring(0, 200)}`);
      }

      const audioBuffer = await response.arrayBuffer();
      console.log(`   ✅ Generated audio: ${Math.round(audioBuffer.byteLength / 1024)}KB`);

      const tempFile = path.join(tempDir, `part1_${section.name}_temp.mp3`);
      fs.writeFileSync(tempFile, Buffer.from(audioBuffer));
      
      // Get original duration
      const originalDurationOutput = execSync(
        `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${tempFile}"`
      ).toString().trim();
      const originalDuration = parseFloat(originalDurationOutput);
      console.log(`   ⏱️ Original duration: ${originalDuration.toFixed(2)}s`);
    }

    // Ensure output directory exists
    const outputDir = path.join(__dirname, '..', 'cache', 'audio', 'he-arrived-20-dream', 'part1');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const tempFile = path.join(tempDir, `part1_${section.name}_temp.mp3`);

    // Get original duration
    const originalDurationOutput = execSync(
      `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${tempFile}"`
    ).toString().trim();
    const originalDuration = parseFloat(originalDurationOutput);
    console.log(`   ⏱️ Original duration: ${originalDuration.toFixed(2)}s`);

    let finalFile = tempFile;

    // Apply additional slowdown if needed (for 0.70x target)
    if (section.ffmpegSlowdown && section.speed < 0.85) {
      const targetSpeed = section.speed / elevenLabsSpeed; // Additional slowdown needed
      
      execSync(
        `ffmpeg -i "${tempFile}" -filter:a "atempo=${targetSpeed}" -y "${path.join(outputDir, `part1_${section.name}.mp3`)}"`,
        { stdio: 'ignore' }
      );
      
      console.log(`   🎚️ Applied FFmpeg atempo=${targetSpeed.toFixed(2)} (additional slowdown)`);
      
      // Get final duration
      const finalFile = path.join(outputDir, `part1_${section.name}.mp3`);
      const finalDurationOutput = execSync(
        `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${finalFile}"`
      ).toString().trim();
      const finalDuration = parseFloat(finalDurationOutput);
      console.log(`   ⏱️ Final duration: ${finalDuration.toFixed(2)}s`);
    } else {
      // Just copy to final location
      const finalFile = path.join(outputDir, `part1_${section.name}.mp3`);
      fs.copyFileSync(tempFile, finalFile);
      console.log(`   ✅ Audio saved: ${finalFile}`);
    }

    // Clean up temp file
    if (fs.existsSync(tempFile)) {
      fs.unlinkSync(tempFile);
    }

    console.log(`   ✅ Complete: cache/audio/he-arrived-20-dream/part1/part1_${section.name}.mp3`);

  } catch (error) {
    console.error(`   ❌ Error generating audio for ${section.name}:`, error.message);
    throw error;
  }
}

async function main() {
  console.log('🎙️ Generating Part 1 Audio Files for "He Arrived with $20 and a Dream"');
  console.log('='.repeat(70));

  for (const section of AUDIO_SECTIONS) {
    try {
      await generateAudio(section);
    } catch (error) {
      console.error(`\n❌ Failed to generate ${section.name}:`, error.message);
      process.exit(1);
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log('✅ All Part 1 audio files generated successfully!');
  console.log('\n📁 Output directory: cache/audio/he-arrived-20-dream/part1/');
  console.log('   - part1_hook.mp3');
  console.log('   - part1_main-story.mp3');
  console.log('   - part1_vocabulary.mp3');
  console.log('   - part1_shadowing.mp3');
  console.log('   - part1_cliffhanger.mp3');
}

main().catch(console.error);

