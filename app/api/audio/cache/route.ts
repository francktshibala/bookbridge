import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface SentenceAudio {
  text: string;
  audioUrl: string;
  duration: number;
  wordTimings: WordTiming[];
  sentenceIndex: number;
}

interface WordTiming {
  word: string;
  startTime: number;
  endTime: number;
  wordIndex: number;
}

/**
 * GET /api/audio/cache
 * Retrieve cached audio for a specific book chunk
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const bookId = searchParams.get('bookId');
    const chunkIndex = searchParams.get('chunkIndex');
    const cefrLevel = searchParams.get('cefrLevel');
    const voiceId = searchParams.get('voiceId');

    // Validate required parameters
    if (!bookId || !chunkIndex || !cefrLevel || !voiceId) {
      return NextResponse.json(
        { error: 'Missing required parameters: bookId, chunkIndex, cefrLevel, voiceId' },
        { status: 400 }
      );
    }

    // Query AudioCache table for cached audio segments
    const { data: cachedAudio, error: cacheError } = await supabase
      .from('AudioCache')
      .select('*')
      .eq('bookId', bookId)
      .eq('chunkIndex', parseInt(chunkIndex))
      .eq('cefrLevel', cefrLevel)
      .eq('voiceId', voiceId)
      .gt('expiresAt', new Date().toISOString()) // Only non-expired cache
      .order('sentenceIndex');

    if (cacheError) {
      console.error('Cache query error:', cacheError);
      return NextResponse.json(
        { error: 'Failed to query audio cache' },
        { status: 500 }
      );
    }

    // If no cached audio found, return null
    if (!cachedAudio || cachedAudio.length === 0) {
      return NextResponse.json({
        cached: false,
        audioData: null,
        message: 'No cached audio found'
      });
    }

    // Query word timings for the cached audio
    const { data: wordTimings, error: timingError } = await supabase
      .from('AudioWordTimings')
      .select('*')
      .eq('bookId', bookId)
      .eq('chunkIndex', parseInt(chunkIndex))
      .eq('cefrLevel', cefrLevel)
      .eq('voiceId', voiceId)
      .order('wordIndex');

    if (timingError) {
      console.error('Word timings query error:', timingError);
      // Continue without word timings - not critical
    }

    // Combine audio cache with word timings
    const sentenceAudioData: SentenceAudio[] = cachedAudio.map(cache => {
      // Find word timings for this sentence
      const sentenceTimings = wordTimings?.filter(timing => 
        timing.wordIndex >= cache.sentenceIndex * 50 && // Rough estimate
        timing.wordIndex < (cache.sentenceIndex + 1) * 50
      ) || [];

      return {
        text: cache.text || '', // Assuming we store text in cache
        audioUrl: cache.audioUrl,
        duration: cache.duration,
        sentenceIndex: cache.sentenceIndex,
        wordTimings: sentenceTimings.map(timing => ({
          word: timing.word,
          startTime: timing.startTime,
          endTime: timing.endTime,
          wordIndex: timing.wordIndex
        }))
      };
    });

    return NextResponse.json({
      cached: true,
      audioData: sentenceAudioData,
      message: `Found ${sentenceAudioData.length} cached audio segments`,
      cacheInfo: {
        totalSize: cachedAudio.reduce((sum, cache) => sum + (cache.fileSize || 0), 0),
        oldestCache: Math.min(...cachedAudio.map(cache => new Date(cache.createdAt).getTime())),
        newestCache: Math.max(...cachedAudio.map(cache => new Date(cache.createdAt).getTime()))
      }
    });

  } catch (error) {
    console.error('Audio cache GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/audio/cache
 * Store generated audio in cache
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { bookId, chunkIndex, cefrLevel, voiceId, sentenceAudio } = body;

    // Validate required data
    if (!bookId || chunkIndex === undefined || !cefrLevel || !voiceId || !sentenceAudio) {
      return NextResponse.json(
        { error: 'Missing required data' },
        { status: 400 }
      );
    }

    const audio = sentenceAudio as SentenceAudio;

    // Store audio cache entry
    const { data: cacheData, error: cacheError } = await supabase
      .from('AudioCache')
      .insert({
        bookId,
        chunkIndex: parseInt(chunkIndex),
        cefrLevel,
        voiceId,
        sentenceIndex: audio.sentenceIndex,
        audioUrl: audio.audioUrl,
        duration: audio.duration,
        fileSize: estimateAudioFileSize(audio.duration), // Rough estimate
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
      })
      .select()
      .single();

    if (cacheError) {
      console.error('Cache insert error:', cacheError);
      return NextResponse.json(
        { error: 'Failed to cache audio' },
        { status: 500 }
      );
    }

    // Store word timings if available
    if (audio.wordTimings && audio.wordTimings.length > 0) {
      const wordTimingEntries = audio.wordTimings.map(timing => ({
        bookId,
        chunkIndex: parseInt(chunkIndex),
        cefrLevel,
        voiceId,
        wordIndex: timing.wordIndex,
        word: timing.word,
        startTime: timing.startTime,
        endTime: timing.endTime
      }));

      const { error: timingError } = await supabase
        .from('AudioWordTimings')
        .insert(wordTimingEntries);

      if (timingError) {
        console.error('Word timing insert error:', timingError);
        // Don't fail the request - word timings are not critical
      }
    }

    return NextResponse.json({
      success: true,
      cached: true,
      cacheId: cacheData.id,
      message: 'Audio cached successfully'
    });

  } catch (error) {
    console.error('Audio cache POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/audio/cache
 * Clear cache for a specific book or all expired cache
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const bookId = searchParams.get('bookId');
    const clearExpired = searchParams.get('clearExpired') === 'true';

    if (clearExpired) {
      // Clear all expired cache entries
      const { data: deletedCache, error: cacheError } = await supabase
        .from('AudioCache')
        .delete()
        .lt('expiresAt', new Date().toISOString())
        .select('id');

      // Get expired book IDs first
      const { data: expiredBooks } = await supabase
        .from('AudioCache')
        .select('bookId')
        .lt('expiresAt', new Date().toISOString());

      const expiredBookIds = expiredBooks?.map(book => book.bookId) || [];

      const { data: deletedTimings, error: timingError } = await supabase
        .from('AudioWordTimings')
        .delete()
        .in('bookId', expiredBookIds)
        .select('id');

      return NextResponse.json({
        success: true,
        message: `Cleared ${deletedCache?.length || 0} expired cache entries`,
        deletedCache: deletedCache?.length || 0,
        deletedTimings: deletedTimings?.length || 0
      });
    }

    if (bookId) {
      // Clear cache for specific book
      const { data: deletedCache, error: cacheError } = await supabase
        .from('AudioCache')
        .delete()
        .eq('bookId', bookId)
        .select('id');

      const { data: deletedTimings, error: timingError } = await supabase
        .from('AudioWordTimings')
        .delete()
        .eq('bookId', bookId)
        .select('id');

      return NextResponse.json({
        success: true,
        message: `Cleared cache for book ${bookId}`,
        deletedCache: deletedCache?.length || 0,
        deletedTimings: deletedTimings?.length || 0
      });
    }

    return NextResponse.json(
      { error: 'Must specify either bookId or clearExpired=true' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Audio cache DELETE error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Estimate audio file size based on duration
 * Rough calculation: 1 minute of MP3 audio ≈ 1MB
 */
function estimateAudioFileSize(durationSeconds: number): number {
  const durationMinutes = durationSeconds / 60;
  const estimatedMB = durationMinutes * 1; // 1MB per minute
  return Math.round(estimatedMB * 1024 * 1024); // Convert to bytes
}