import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/audio/pregenerated
 * Retrieve pre-generated audio for instant playback
 * 
 * Query params:
 * - bookId: string
 * - cefrLevel: string  
 * - chunkIndex: number
 * - voiceId: string
 * - cacheKey?: string (optional direct cache lookup)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Get query parameters
    const cacheKey = searchParams.get('cacheKey');
    const bookId = searchParams.get('bookId');
    const cefrLevel = searchParams.get('cefrLevel');
    const chunkIndex = searchParams.get('chunkIndex');
    const voiceId = searchParams.get('voiceId');

    // Validate required parameters (unless using direct cache key)
    if (!cacheKey && (!bookId || !cefrLevel || !chunkIndex || !voiceId)) {
      return NextResponse.json(
        { 
          error: 'Missing required parameters', 
          required: ['bookId', 'cefrLevel', 'chunkIndex', 'voiceId'],
          provided: { bookId, cefrLevel, chunkIndex, voiceId }
        },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Generate cache key for this request
    const generatedCacheKey = `${bookId}_${cefrLevel}_${chunkIndex}_${voiceId}`;
    const lookupKey = cacheKey || generatedCacheKey;

    console.log(`🔍 Checking for pre-generated audio: ${lookupKey}`);

    // Check for pre-generated audio assets
    const { data: audioAssets, error } = await supabase
      .from('audio_assets')
      .select('*')
      .eq('book_id', bookId)
      .eq('cefr_level', cefrLevel)
      .eq('chunk_index', parseInt(chunkIndex!))
      .eq('voice_id', voiceId)
      .gte('expires_at', new Date().toISOString())
      .order('sentence_index', { ascending: true });

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Database query failed' },
        { status: 500 }
      );
    }

    // If no audio assets found, return cache miss
    if (!audioAssets || audioAssets.length === 0) {
      console.log(`❌ No pre-generated audio found for: ${lookupKey}`);
      return NextResponse.json({
        cached: false,
        message: 'No pre-generated audio available'
      });
    }

    console.log(`✅ Found ${audioAssets.length} pre-generated audio assets for: ${lookupKey}`);

    // Update last_accessed timestamp for cache management
    await supabase
      .from('audio_assets')
      .update({ last_accessed: new Date().toISOString() })
      .eq('book_id', bookId)
      .eq('cefr_level', cefrLevel)
      .eq('chunk_index', parseInt(chunkIndex!))
      .eq('voice_id', voiceId);

    // Transform database records to API format
    const formattedAudioAssets = audioAssets.map(asset => ({
      id: asset.id,
      sentenceIndex: asset.sentence_index,
      audioUrl: asset.audio_url,
      duration: parseFloat(asset.duration),
      wordTimings: asset.word_timings,
      provider: asset.provider,
      voiceId: asset.voice_id,
      format: asset.format || 'mp3'
    }));

    // Calculate metadata
    const totalDuration = formattedAudioAssets.reduce((sum, asset) => sum + asset.duration, 0);
    
    const metadata = {
      bookId,
      cefrLevel,
      chunkIndex: parseInt(chunkIndex!),
      voiceId,
      totalSentences: formattedAudioAssets.length,
      totalDuration,
      cacheKey: lookupKey
    };

    return NextResponse.json({
      cached: true,
      audioAssets: formattedAudioAssets,
      metadata,
      message: `Pre-generated audio ready: ${formattedAudioAssets.length} sentences, ${totalDuration.toFixed(1)}s total`
    });

  } catch (error) {
    console.error('Pre-generated audio API error:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: 'Failed to retrieve pre-generated audio',
        fallback: 'Use progressive generation'
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/audio/pregenerated
 * Trigger pre-generation for a book
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { bookId, totalChunks, priority = 'normal' } = body;

    if (!bookId || !totalChunks) {
      return NextResponse.json(
        { error: 'Missing required fields: bookId, totalChunks' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Initialize book pre-generation status
    const totalCombinations = totalChunks * 6 * 6; // 6 CEFR levels × 6 voices
    
    const { error: statusError } = await supabase
      .from('book_pregeneration_status')
      .upsert({
        book_id: bookId,
        total_combinations: totalCombinations,
        status: 'pending',
        estimated_total_cost_cents: totalCombinations * 10 // $0.10 per combination estimate
      });

    if (statusError) {
      console.error('Failed to initialize book status:', statusError);
      return NextResponse.json(
        { error: 'Failed to initialize pre-generation status' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Pre-generation initialized for book ${bookId}`,
      bookId,
      totalChunks,
      totalCombinations,
      estimatedCompletionTime: calculateEstimatedTime(totalChunks)
    });

  } catch (error) {
    console.error('Pre-generation initialization error:', error);
    
    return NextResponse.json(
      { error: 'Failed to initialize pre-generation' },
      { status: 500 }
    );
  }
}


/**
 * Helper function to calculate estimated completion time
 */
function calculateEstimatedTime(totalChunks: number): string {
  // Estimate based on:
  // - 3 sentences per chunk average
  // - 6 CEFR levels × 9 voices = 54 combinations per chunk
  // - 2 seconds per TTS call average
  // - Parallel processing (5 workers)
  
  const totalJobs = totalChunks * 54 * 3; // Total sentence generations needed
  const avgProcessingTime = 2; // seconds per job
  const parallelWorkers = 5;
  
  const estimatedSeconds = (totalJobs * avgProcessingTime) / parallelWorkers;
  const estimatedHours = Math.ceil(estimatedSeconds / 3600);
  
  if (estimatedHours < 1) {
    return `${Math.ceil(estimatedSeconds / 60)} minutes`;
  } else if (estimatedHours < 24) {
    return `${estimatedHours} hours`;
  } else {
    return `${Math.ceil(estimatedHours / 24)} days`;
  }
}