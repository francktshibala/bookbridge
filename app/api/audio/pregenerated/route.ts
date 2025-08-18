import { NextRequest, NextResponse } from 'next/server';
import { audioPreGenerationService } from '../../../../lib/audio-pregeneration-service';

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

    let audioAssets;

    if (cacheKey) {
      // Direct cache key lookup
      audioAssets = await getAudioByCacheKey(cacheKey);
    } else {
      // Parameter-based lookup
      audioAssets = await audioPreGenerationService.getPreGeneratedAudio(
        bookId!,
        cefrLevel!,
        parseInt(chunkIndex!),
        voiceId!
      );
    }

    if (!audioAssets || audioAssets.length === 0) {
      return NextResponse.json(
        { 
          cached: false,
          audioAssets: null,
          message: 'No pre-generated audio found. Use progressive generation.',
          fallback: {
            endpoint: '/api/audio/progressive',
            method: 'POST',
            body: { bookId, cefrLevel, chunkIndex, voiceId }
          }
        },
        { status: 404 }
      );
    }

    // Update access tracking
    await updateAudioAccess(audioAssets);

    return NextResponse.json({
      cached: true,
      audioAssets: audioAssets.map(asset => ({
        id: asset.id,
        sentenceIndex: asset.sentenceIndex,
        audioUrl: asset.audioUrl,
        duration: asset.duration,
        wordTimings: asset.wordTimings,
        provider: asset.provider,
        voiceId: asset.voiceId,
        format: asset.format
      })),
      metadata: {
        bookId,
        cefrLevel,
        chunkIndex: parseInt(chunkIndex || '0'),
        voiceId,
        totalSentences: audioAssets.length,
        totalDuration: audioAssets.reduce((sum, asset) => sum + asset.duration, 0),
        cacheKey: audioAssets[0]?.cacheKey
      }
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

    // Initialize pre-generation for the book
    await audioPreGenerationService.initializeBookPreGeneration(bookId, totalChunks);

    return NextResponse.json({
      success: true,
      message: `Pre-generation initialized for book ${bookId}`,
      bookId,
      totalChunks,
      estimatedCompletionTime: calculateEstimatedTime(totalChunks),
      queueStatus: {
        urgent: 3, // Popular combinations for first 3 chunks
        high: 18,  // All combinations for first 3 chunks  
        normal: totalChunks * 54 - 21 // Remaining combinations
      }
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
 * Helper function to get audio by cache key
 */
async function getAudioByCacheKey(cacheKey: string) {
  // TODO: Implement database lookup by cache key
  // For now, return null to indicate not implemented
  console.log(`Looking up audio by cache key: ${cacheKey}`);
  return null;
}

/**
 * Helper function to update audio access tracking
 */
async function updateAudioAccess(audioAssets: any[]) {
  // TODO: Implement database update for access tracking
  // This helps with cache management and analytics
  console.log(`Updating access for ${audioAssets.length} audio assets`);
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