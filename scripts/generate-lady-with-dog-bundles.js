import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { config } from 'dotenv';
import { execSync } from 'child_process';
import { promisify } from 'util';
import { exec } from 'child_process';
import crypto from 'crypto';

const execAsync = promisify(exec);

// Load environment variables
config({ path: '.env.local' });

// VALIDATED VOICE IDs (from MASTER_MISTAKES_PREVENTION.md)
const VALIDATED_VOICES = {
  'daniel': 'onwK4e9ZLuTAKqWW03F9',  // British deep news presenter
  'sarah': 'EXAVITQu4vr4xnSDxMaL',   // American soft news
  'jane': 'RILOU7YmBhvwJGDGjNmP'     // Professional audiobook reader
};

const prisma = new PrismaClient();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// NOVEMBER 2025 PRODUCTION STANDARD - FFmpeg 0.85× Post-Processing
const TARGET_SPEED = 0.85;  // 18% slower, comfortable pace

// PRODUCTION VOICE SETTINGS (November 2025)
const SARAH_VOICE_SETTINGS = {
  voice_id: 'EXAVITQu4vr4xnSDxMaL',  // Sarah voice ID (American soft news)
  model_id: 'eleven_monolingual_v1',  // English-focused model
  voice_settings: {
    stability: 0.5,                    // Clarity for ESL learners
    similarity_boost: 0.8,             // Enhanced presence
    style: 0.05,                       // Subtle sophistication
    use_speaker_boost: true
  },
  speed: 0.90,                          // Generate at default (API may ignore)
  output_format: 'mp3_44100_128',
  apply_text_normalization: 'auto'
};

const DANIEL_VOICE_SETTINGS = {
  voice_id: 'onwK4e9ZLuTAKqWW03F9',  // Standard Daniel voice ID (production)
  model_id: 'eleven_monolingual_v1',  // English-focused model
  voice_settings: {
    stability: 0.45,                   // Enhanced clarity
    similarity_boost: 0.8,             // Enhanced presence
    style: 0.1,                        // Natural expressiveness
    use_speaker_boost: true
  },
  speed: 0.90,                          // Generate at default (API may ignore)
  output_format: 'mp3_44100_128',
  apply_text_normalization: 'auto'
};

// VOICE MAPPING FOR LADY WITH THE DOG: A1 → Sarah, A2 → Daniel, B1 → Daniel
function getVoiceForLevel(level) {
  const voiceMapping = {
    'A1': SARAH_VOICE_SETTINGS,  // A1 uses Sarah (American soft news)
    'A2': DANIEL_VOICE_SETTINGS,  // A2 uses Daniel
    'B1': DANIEL_VOICE_SETTINGS   // B1 uses Daniel
  };
  return voiceMapping[level] || SARAH_VOICE_SETTINGS;
}

const BOOK_ID = 'lady-with-dog';

// SCRIPT LEVEL VALIDATION - MANDATORY FIRST (prevents runtime failures)
const VALID_LEVELS = ['A1', 'A2', 'B1'];

// Get target level from command line argument
const targetLevel = process.argv[2];
const isPilot = process.argv.includes('--pilot');

// Validate level before proceeding
if (!targetLevel) {
  console.error('❌ Error: Please specify a CEFR level (A1, A2, or B1)');
  console.log('Usage: node scripts/generate-lady-with-dog-bundles.js [A1|A2|B1] [--pilot]');
  process.exit(1);
}

if (!VALID_LEVELS.includes(targetLevel)) {
  console.error(`❌ Error: Invalid level "${targetLevel}". Valid levels: ${VALID_LEVELS.join(', ')}`);
  process.exit(1);
}

const CEFR_LEVEL = targetLevel;
const voiceSettings = getVoiceForLevel(CEFR_LEVEL);

console.log(`🎵 Generating bundles for "${BOOK_ID}" at ${CEFR_LEVEL} level`);
const voiceName = CEFR_LEVEL === 'A1' ? 'Sarah' : 'Daniel';
console.log(`🗣️ Using voice: ${voiceSettings.voice_id} (${voiceName})`);

if (isPilot) {
  console.log('🧪 PILOT MODE: Will generate only first 3 bundles (~$0.30 cost)');
}

// Check ElevenLabs quota (MASTER_MISTAKES_PREVENTION.md requirement)
async function checkElevenLabsQuota() {
  try {
    const response = await fetch('https://api.elevenlabs.io/v1/user/subscription', {
      headers: {
        'xi-api-key': process.env.ELEVENLABS_API_KEY
      }
    });

    if (!response.ok) {
      console.warn('⚠️ Could not check ElevenLabs quota (API error)');
      return;
    }

    const data = await response.json();
    const availableChars = data.character_limit - data.character_count;
    const availableCredits = data.available_credits || 0;

    console.log(`📊 ElevenLabs Status:`);
    console.log(`   Available characters: ${availableChars.toLocaleString()}`);
    console.log(`   Available credits: ${availableCredits.toLocaleString()}`);

    // Estimate cost for Lady with the Dog A1
    const estimatedChars = 200 * 30 * 5; // Rough estimate
    const estimatedCredits = Math.ceil(estimatedChars / 1000) * 16.5; // $0.165 per 1k chars

    if (availableCredits > 0 && availableCredits < estimatedCredits) {
      console.warn(`⚠️ WARNING: Estimated cost (${estimatedCredits} credits) exceeds available (${availableCredits} credits)`);
    } else if (availableChars < estimatedChars) {
      console.warn(`⚠️ WARNING: Estimated characters (${estimatedChars.toLocaleString()}) exceeds available (${availableChars.toLocaleString()})`);
    } else {
      console.log(`✅ Sufficient quota available for generation`);
    }
  } catch (error) {
    console.warn('⚠️ Could not check ElevenLabs quota:', error.message);
    // Continue anyway - quota check is best effort
  }
}

// Generate TTS audio using ElevenLabs with retry logic (MASTER_MISTAKES_PREVENTION.md requirement)
async function generateElevenLabsAudio(text, voiceSettings, maxRetries = 3) {
  // Validate voice ID before request
  const voiceId = voiceSettings.voice_id;
  const isValidVoice = Object.values(VALIDATED_VOICES).includes(voiceId);
  if (!isValidVoice) {
    console.warn(`⚠️ Voice ID ${voiceId} not in validated list - proceeding anyway`);
  }

  let lastError;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': process.env.ELEVENLABS_API_KEY
        },
        body: JSON.stringify({
          text: text,
          model_id: voiceSettings.model_id,
          voice_settings: voiceSettings.voice_settings,
          speed: voiceSettings.speed || 0.90
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`ElevenLabs API error: ${response.status} ${response.statusText} - ${errorText.substring(0, 200)}`);
      }

      return await response.arrayBuffer();
    } catch (error) {
      lastError = error;
      
      // Check for rate limit errors
      if (error.message.includes('429') || error.message.includes('rate limit')) {
        const delay = 1000 * Math.pow(2, attempt); // Exponential backoff
        console.log(`⏳ Rate limited (attempt ${attempt}/${maxRetries}), waiting ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      if (attempt === maxRetries) {
        throw lastError;
      }

      // Exponential backoff for other errors
      const delay = 1000 * Math.pow(2, attempt);
      console.log(`⏳ Retrying (attempt ${attempt}/${maxRetries}) in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

// Check if file already exists in Supabase
async function fileExists(fileName) {
  try {
    const { data, error } = await supabase.storage
      .from('audio-files')
      .list(fileName.split('/').slice(0, -1).join('/'), {
        search: fileName.split('/').pop()
      });
    
    if (error) return false;
    return data && data.length > 0;
  } catch (error) {
    return false;
  }
}

// Upload to Supabase with retry logic
async function uploadToSupabase(audioBuffer, fileName, maxRetries = 3) {
  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const { data, error } = await supabase.storage
        .from('audio-files')
        .upload(fileName, audioBuffer, {
          contentType: 'audio/mpeg',
          upsert: true // Overwrite existing files to avoid errors
        });

      if (error) throw error;
      return { data, error: null };

    } catch (error) {
      lastError = error;

      // Check for "already exists" errors (Supabase returns different error codes)
      const errorMessage = error.message || error.toString() || '';
      const errorCode = error.statusCode || error.code || '';
      
      if (errorMessage.includes('already exists') || 
          errorMessage.includes('duplicate') ||
          errorCode === '409' || // Conflict
          errorCode === '23505') { // PostgreSQL unique violation
        return { data: null, error: { message: 'File already exists', code: 'EXISTS' } };
      }

      if (attempt === maxRetries) break;

      // Exponential backoff with jitter
      const delay = Math.min(
        1000 * Math.pow(2, attempt) + Math.random() * 1000,
        10000
      );

      console.log(`⏳ Upload failed (attempt ${attempt + 1}): ${errorMessage.substring(0, 100)}`);
      console.log(`   Retrying in ${Math.round(delay)}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

async function generateLadyWithDogBundles() {
  console.log(`\n📚 Starting bundle generation for "The Lady with the Dog" (${CEFR_LEVEL})...`);

  try {
    // PHASE 0: System Validation (MASTER_MISTAKES_PREVENTION.md requirement)
    console.log('\n🔍 Phase 0: System Validation...');
    
    // Check for running processes
    try {
      const { stdout } = await execAsync('ps aux | grep -E "(generate|simplify|modernize)" | grep -v grep');
      if (stdout.trim()) {
        console.warn('⚠️ WARNING: Other generation/simplification processes detected:');
        console.warn(stdout);
        console.warn('Consider stopping them to prevent race conditions');
        // Don't exit - just warn
      }
    } catch (error) {
      // No other processes found - safe to proceed
    }

    // Check ElevenLabs quota
    await checkElevenLabsQuota();

    // Verify environment variables
    if (!process.env.ELEVENLABS_API_KEY) {
      throw new Error('ELEVENLABS_API_KEY environment variable is not set');
    }
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Supabase environment variables are not set');
    }

    console.log('✅ System validation complete\n');

    // Load simplified sentences from cache (JSON format for lady-with-dog)
    const cacheFile = path.join(process.cwd(), 'cache', `${BOOK_ID}-${CEFR_LEVEL}-simplified.json`);

    if (!fs.existsSync(cacheFile)) {
      throw new Error(`Simplified cache not found: ${cacheFile}. Run simplify script first.`);
    }

    const cachedData = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
    const simplifiedSentences = cachedData.sentences;

    console.log(`📖 Loaded ${simplifiedSentences.length} simplified sentences`);

    // Create bundles (4 sentences each)
    const BUNDLE_SIZE = 4;
    const bundles = [];

    for (let i = 0; i < simplifiedSentences.length; i += BUNDLE_SIZE) {
      const bundleSentences = simplifiedSentences.slice(i, i + BUNDLE_SIZE);

      bundles.push({
        index: Math.floor(i / BUNDLE_SIZE),
        sentences: bundleSentences.map(s => ({
          sentenceIndex: s.sentenceIndex,
          text: s.simplifiedText,
          wordCount: s.wordCount
        }))
      });
    }

    console.log(`📦 Created ${bundles.length} bundles of ${BUNDLE_SIZE} sentences each`);

    // Ensure BookContent record exists
    const totalText = simplifiedSentences.map(s => s.simplifiedText).join(' ');
    await prisma.bookContent.upsert({
      where: { bookId: BOOK_ID },
      update: {
        title: 'The Lady with the Dog',
        author: 'Anton Chekhov',
        fullText: totalText,
        era: 'russian-realist',
        wordCount: totalText.split(/\s+/).length,
        totalChunks: bundles.length
      },
      create: {
        bookId: BOOK_ID,
        title: 'The Lady with the Dog',
        author: 'Anton Chekhov',
        fullText: totalText,
        era: 'russian-realist',
        wordCount: totalText.split(/\s+/).length,
        totalChunks: bundles.length
      }
    });

    // Limit to pilot if requested (3 bundles max for cost control)
    const bundlesToProcess = isPilot ? bundles.slice(0, 3) : bundles;
    console.log(`🔄 Will process ${bundlesToProcess.length} bundles`);

    // Check for existing bundles to enable resume (skip already generated)
    const existingBundles = await prisma.bookChunk.findMany({
      where: {
        bookId: BOOK_ID,
        cefrLevel: CEFR_LEVEL
      },
      select: { chunkIndex: true }
    });

    const existingIndices = new Set(existingBundles.map(b => b.chunkIndex));
    // Skip bundles that already exist (resume mode - faster!)
    const bundlesToGenerate = bundlesToProcess.filter(b => !existingIndices.has(b.index));

    console.log(`📊 Resume mode: ${existingIndices.size} existing, ${bundlesToGenerate.length} new bundles to generate`);

    let processedCount = 0;
    const voiceType = CEFR_LEVEL === 'A1' ? 'Sarah' : 'Daniel';

    for (const bundle of bundlesToGenerate) {
      try {
        console.log(`\n🎵 Processing bundle ${bundle.index}/${bundles.length - 1}...`);

        // Combine sentences for audio
        const bundleText = bundle.sentences.map(s => s.text).join(' ');
        const totalWords = bundle.sentences.reduce((sum, s) => sum + s.wordCount, 0);

        // MANDATORY TTS PAYLOAD VERIFICATION (MASTER_MISTAKES_PREVENTION.md requirement)
        const textHash = crypto.createHash('sha256').update(bundleText).digest('hex').substring(0, 16);
        const sentenceCount = bundle.sentences.length; // Use array count (not regex)
        
        // Flexible bundle size validation (final bundle can be 1-4 sentences)
        const expectedSentences = bundle.index === bundles.length - 1 ? [1, 2, 3, 4] : [4];
        if (!expectedSentences.includes(bundle.sentences.length)) {
          throw new Error(`Bundle ${bundle.index}: Expected ${expectedSentences.join(', ')} sentences, got ${bundle.sentences.length}`);
        }

        console.log(`   📝 Text: "${bundleText.substring(0, 100)}..."`);
        console.log(`   📊 ${totalWords} words, ${sentenceCount} sentences`);
        console.log(`   🔒 Hash: ${textHash}`);

        // Book-specific CDN path (check BEFORE generating audio to save money)
        const audioFileName = `${BOOK_ID}/${CEFR_LEVEL}/${voiceSettings.voice_id}/bundle_${bundle.index}.mp3`;
        
        // Check if audio file already exists BEFORE generating (saves API costs)
        const audioExists = await fileExists(audioFileName);
        if (audioExists && CEFR_LEVEL !== 'A1') {
          // For non-A1 levels, skip if file exists (resume mode)
          console.log('   📁 Audio file already exists, skipping generation...');
          // Still need to create database record, so continue to database save
          // But skip audio generation
          const existingChunk = await prisma.bookChunk.findFirst({
            where: {
              bookId: BOOK_ID,
              cefrLevel: CEFR_LEVEL,
              chunkIndex: bundle.index
            },
            select: { audioDurationMetadata: true }
          });
          
          if (existingChunk && existingChunk.audioDurationMetadata) {
            // Use existing metadata
            processedCount++;
            console.log(`   ✅ Bundle ${bundle.index} skipped (already exists) (${processedCount}/${bundlesToGenerate.length})`);
            continue;
          }
        }

        // Generate audio at default speed (0.90×)
        console.log('   🎙️ Generating audio at default speed...');
        const originalAudioBuffer = await generateElevenLabsAudio(bundleText, voiceSettings);

        // Ensure temp directory exists
        const tempDir = path.join(process.cwd(), 'temp');
        if (!fs.existsSync(tempDir)) {
          fs.mkdirSync(tempDir, { recursive: true });
        }

        // Save original audio to temp file
        const tempOriginalFile = path.join(tempDir, `bundle_${bundle.index}_original_temp.mp3`);
        fs.writeFileSync(tempOriginalFile, Buffer.from(originalAudioBuffer));

        // Measure original duration
        let originalDuration = null;
        try {
          const command = `ffprobe -v quiet -show_entries format=duration -of csv=p=0 "${tempOriginalFile}"`;
          const result = execSync(command, { encoding: 'utf-8' }).trim();
          originalDuration = parseFloat(result);
          console.log(`   ⏱️ Original duration: ${originalDuration.toFixed(3)}s`);
        } catch (error) {
          console.error('   ❌ CRITICAL: Could not measure original duration:', error.message);
          throw new Error('Solution 1 requires ffprobe measurement - cannot proceed without it');
        }

        // Apply FFmpeg post-processing to slow to 0.85× (November 2025 production formula)
        console.log(`   🎚️ Slowing audio to ${TARGET_SPEED}× using FFmpeg...`);
        const tempSlowedFile = path.join(tempDir, `bundle_${bundle.index}_slowed_temp.mp3`);
        const ffmpegCommand = `ffmpeg -i "${tempOriginalFile}" -filter:a "atempo=${TARGET_SPEED}" -y "${tempSlowedFile}"`;
        
        try {
          await execAsync(ffmpegCommand);
          console.log(`   ✅ Audio slowed successfully`);
        } catch (error) {
          console.error('   ❌ FFmpeg processing failed:', error.message);
          throw new Error(`FFmpeg processing failed: ${error.message}`);
        }

        // Read slowed audio buffer
        const slowedAudioBuffer = fs.readFileSync(tempSlowedFile);

        // Measure slowed duration (CRITICAL for sync)
        let measuredDuration = null;
        try {
          const command = `ffprobe -v quiet -show_entries format=duration -of csv=p=0 "${tempSlowedFile}"`;
          const result = execSync(command, { encoding: 'utf-8' }).trim();
          measuredDuration = parseFloat(result);
          console.log(`   ⏱️ MEASURED DURATION (slowed): ${measuredDuration.toFixed(3)}s (Solution 1 - exact)`);
          console.log(`   📊 Speed change: ${originalDuration.toFixed(3)}s → ${measuredDuration.toFixed(3)}s (${((measuredDuration / originalDuration - 1) * 100).toFixed(1)}% slower)`);
        } catch (error) {
          console.error('   ❌ CRITICAL: Could not measure slowed duration:', error.message);
          throw new Error('Solution 1 requires ffprobe measurement - cannot proceed without it');
        } finally {
          // Clean up temp files
          if (fs.existsSync(tempOriginalFile)) fs.unlinkSync(tempOriginalFile);
          if (fs.existsSync(tempSlowedFile)) fs.unlinkSync(tempSlowedFile);
        }

        // SOLUTION 1: Always use measured slowed duration (MANDATORY - no fallback)
        if (!measuredDuration) {
          throw new Error('Solution 1 requires measured duration - cannot proceed with estimation');
        }
        const finalDuration = measuredDuration;

        // Upload slowed audio to Supabase (file check already done above)
        console.log('   ☁️ Uploading slowed audio to Supabase...');
        try {
          const result = await uploadToSupabase(slowedAudioBuffer, audioFileName);
          if (result.error && result.error.code === 'EXISTS') {
            console.log('   📁 File already exists (detected during upload), continuing...');
          } else {
            console.log('   ✅ Upload successful');
          }
        } catch (error) {
          const errorMessage = error.message || error.toString() || '';
          if (errorMessage.includes('already exists') || 
              errorMessage.includes('duplicate') ||
              error.statusCode === 409) {
            console.log('   📁 Audio file already exists, continuing...');
          } else {
            console.error(`   ❌ Upload failed: ${errorMessage}`);
            throw new Error(`Upload failed after retries: ${errorMessage}`);
          }
        }

        // Calculate proportional sentence timings (Enhanced Timing v3 - character-based)
        const totalCharacters = bundle.sentences.reduce((sum, s) => sum + s.text.length, 0);
        let currentTime = 0;
        const sentenceTimings = bundle.sentences.map(sentence => {
          // Use character ratio (more accurate than word ratio for sync)
          const charRatio = sentence.text.length / totalCharacters;
          const duration = finalDuration * charRatio;
          const startTime = currentTime;
          const endTime = currentTime + duration;
          currentTime = endTime;

          return {
            sentenceIndex: sentence.sentenceIndex,
            text: sentence.text,
            startTime: parseFloat(startTime.toFixed(3)),
            endTime: parseFloat(endTime.toFixed(3)),
            duration: parseFloat(duration.toFixed(3))
          };
        });

        // Prepare audio duration metadata for caching (Solution 1 + FFmpeg 0.85×)
        const audioDurationMetadata = measuredDuration ? {
          version: 1,
          measuredDuration: measuredDuration,
          originalDuration: originalDuration,
          targetSpeed: TARGET_SPEED,
          sentenceTimings: sentenceTimings,
          measuredAt: new Date().toISOString(),
          method: 'ffprobe-proportional-enhanced',
          processingMethod: 'ffmpeg-atempo',
          // Note: audioHash and fileSize can be added later for full production
        } : null;

        // Save to database with cached duration metadata (use upsert to handle existing bundles)
        await prisma.bookChunk.upsert({
          where: {
            bookId_cefrLevel_chunkIndex: {
              bookId: BOOK_ID,
              cefrLevel: CEFR_LEVEL,
              chunkIndex: bundle.index
            }
          },
          update: {
            chunkText: bundleText,
            wordCount: totalWords,
            isSimplified: true,
            audioFilePath: audioFileName,
            audioProvider: 'elevenlabs',
            audioVoiceId: voiceSettings.voice_id,
            audioDurationMetadata: audioDurationMetadata
          },
          create: {
            bookId: BOOK_ID,
            chunkIndex: bundle.index,
            cefrLevel: CEFR_LEVEL,
            chunkText: bundleText,
            wordCount: totalWords,
            isSimplified: true,
            audioFilePath: audioFileName, // Store only the relative path
            audioProvider: 'elevenlabs',
            audioVoiceId: voiceSettings.voice_id,
            audioDurationMetadata: audioDurationMetadata // Cache the measured duration
          }
        });

        processedCount++;
        console.log(`   ✅ Bundle ${bundle.index} completed (${processedCount}/${bundlesToGenerate.length})`);

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (error) {
        console.error(`   ❌ Failed to process bundle ${bundle.index}:`, error.message);
        throw error;
      }
    }

    console.log(`\n✅ Bundle generation complete!`);
    console.log(`📊 Summary:`);
    console.log(`   📦 Total bundles: ${bundles.length}`);
    console.log(`   🆕 Bundles processed: ${processedCount}`);
    console.log(`   🎯 CEFR Level: ${CEFR_LEVEL}`);
    console.log(`   🗣️ Voice: ${voiceType} (${voiceSettings.voice_id})`);
    console.log(`   ⚙️ Speed: ${TARGET_SPEED}× (FFmpeg post-processing - November 2025 production)`);
    console.log(`   🔧 Method: Generate at 0.90× → FFmpeg slow to ${TARGET_SPEED}× → Solution 1 (ffprobe + Enhanced Timing v3)`);

    if (isPilot) {
      console.log(`\n🧪 PILOT COMPLETE - Run without --pilot flag for full generation`);
    }

  } catch (error) {
    console.error('❌ Bundle generation failed:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  generateLadyWithDogBundles()
    .then(() => console.log('\n🎉 Bundle generation completed successfully!'))
    .catch(console.error);
}

export { generateLadyWithDogBundles };
