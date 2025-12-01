import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string
);

export const runtime = 'nodejs';
export const revalidate = 3600; // Cache for 1 hour

interface BundleMetadata {
  bundleId: string;
  bundleIndex: number;
  audioUrl: string;
  totalDuration: number;
  sentences: Array<{
    sentenceId: string;
    sentenceIndex: number;
    text: string;
    startTime: number;
    endTime: number;
  }>;
}

const BOOK_ID = 'always-a-family';
const CEFR_LEVEL = 'A2';

export async function GET(request: NextRequest) {
  try {
    console.log(`📚 Fetching A2 bundles for "Always a Family"...`);

    const bookChunks = await prisma.bookChunk.findMany({
      where: {
        bookId: BOOK_ID,
        cefrLevel: CEFR_LEVEL
      },
      orderBy: { chunkIndex: 'asc' },
      select: {
        id: true,
        chunkIndex: true,
        chunkText: true,
        audioFilePath: true,
        audioDurationMetadata: true
      }
    });

    console.log(`✅ Found ${bookChunks.length} A2 chunks`);

    const bundles: BundleMetadata[] = [];
    let totalSentencesProcessed = 0;

    bookChunks.forEach((chunk: any, index) => {
      // Generate Supabase storage URL from relative path
      const { data: { publicUrl } } = supabase.storage
        .from('audio-files')
        .getPublicUrl(chunk.audioFilePath || '');
      const audioUrl = publicUrl;

      let sentencesWithTimings;
      let totalDuration: number;

      if (chunk.audioDurationMetadata && typeof chunk.audioDurationMetadata === 'object') {
        const metadata = chunk.audioDurationMetadata as any;
        totalDuration = metadata.measuredDuration || 0;

        if (metadata.sentenceTimings && Array.isArray(metadata.sentenceTimings)) {
          // Use Enhanced Timing v3 pre-calculated timings
          sentencesWithTimings = metadata.sentenceTimings.map((timing: any, idx: number) => ({
            sentenceId: `s${totalSentencesProcessed + idx}`,
            sentenceIndex: timing.sentenceIndex !== undefined ? timing.sentenceIndex : totalSentencesProcessed + idx,
            text: timing.text,
            startTime: timing.startTime, // Enhanced Timing v3 format
            endTime: timing.endTime      // Enhanced Timing v3 format
          }));
        } else {
          console.warn(`Bundle ${index}: No sentenceTimings in metadata, falling back to proportional estimation.`);
          const chunkSentences = chunk.chunkText
            .split(/(?<=[.!?])\s+/)
            .map((s: string) => s.trim())
            .filter((s: string) => s.length > 5);

          const avgDuration = totalDuration / chunkSentences.length;

          sentencesWithTimings = chunkSentences.map((text: string, sentenceIdx: number) => ({
            sentenceId: `s${totalSentencesProcessed + sentenceIdx}`,
            sentenceIndex: totalSentencesProcessed + sentenceIdx,
            text: text,
            startTime: sentenceIdx * avgDuration,
            endTime: (sentenceIdx + 1) * avgDuration
          }));
        }
      } else {
        console.warn(`Bundle ${index}: No cached duration metadata, estimating...`);
        const chunkSentences = chunk.chunkText
          .split(/(?<=[.!?])\s+/)
          .map((s: string) => s.trim())
          .filter((s: string) => s.length > 5);

        const baseSecondsPerWord = 0.30; // Jane voice base rate
        const speed = 0.85; // FFmpeg slowdown applied

        let currentTime = 0;
        sentencesWithTimings = chunkSentences.map((text: string, sentenceIdx: number) => {
          const words = text.split(/\s+/).length;
          const baseDuration = (words * baseSecondsPerWord) / speed;
          const punctuationBonus = text.match(/[.!?]$/) ? 0.3 : 0;
          const estimatedDuration = baseDuration + punctuationBonus + 0.2;

          const sentenceData = {
            sentenceId: `s${totalSentencesProcessed + sentenceIdx}`,
            sentenceIndex: totalSentencesProcessed + sentenceIdx,
            text: text,
            startTime: currentTime,
            endTime: currentTime + estimatedDuration
          };

          currentTime += estimatedDuration;
          return sentenceData;
        });

        totalDuration = currentTime;
      }

      totalSentencesProcessed += sentencesWithTimings.length;

      bundles.push({
        bundleId: `b${chunk.chunkIndex}`,
        bundleIndex: chunk.chunkIndex,
        audioUrl: audioUrl,
        totalDuration: totalDuration,
        sentences: sentencesWithTimings
      });
    });

    const totalDurationMinutes = bundles.reduce((sum, b) => sum + b.totalDuration, 0) / 60;
    console.log(`🎵 Total audio duration: ${totalDurationMinutes.toFixed(2)} minutes`);

    let preview: string | null = null;
    let previewAudio: { audioUrl: string; duration: number } | null = null;

    const cacheDir = path.join(process.cwd(), 'cache');

    const previewTextPath = path.join(cacheDir, `${BOOK_ID}-${CEFR_LEVEL}-preview.txt`);
    if (fs.existsSync(previewTextPath)) {
      preview = fs.readFileSync(previewTextPath, 'utf8').trim();
      console.log(`✅ Loaded A2 preview text from cache (${preview.length} characters)`);
    }

    const previewAudioPath = path.join(cacheDir, `${BOOK_ID}-${CEFR_LEVEL}-preview-audio.json`);
    if (fs.existsSync(previewAudioPath)) {
      const audioMetadata = JSON.parse(fs.readFileSync(previewAudioPath, 'utf8'));
      if (audioMetadata.audio && audioMetadata.audio.url && audioMetadata.audio.duration) {
        previewAudio = {
          audioUrl: audioMetadata.audio.url,
          duration: audioMetadata.audio.duration
        };
        console.log('✅ Loaded A2 preview audio metadata from cache');
      }
    }

    return NextResponse.json({
      success: true,
      bookId: BOOK_ID,
      title: 'Always a Family',
      author: 'Danny & Annie Perasa',
      level: CEFR_LEVEL,
      bundles: bundles,
      bundleCount: bundles.length,
      totalBundles: bundles.length,
      totalSentences: totalSentencesProcessed,
      totalDurationMinutes: parseFloat(totalDurationMinutes.toFixed(2)),
      preview: preview,
      previewAudio: previewAudio,
      audioType: 'elevenlabs',
      timingMethod: 'enhanced-timing-v3' // Indicate Enhanced Timing v3 is used
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400'
      }
    });

  } catch (error) {
    console.error('❌ Error fetching A2 bundles:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Provide more helpful error message for database connection issues
    if (errorMessage.includes('Can\'t reach database server')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Database connection failed',
          message: 'Unable to connect to database. Please check your database connection and try again.'
        },
        { status: 503 } // Service Unavailable
      );
    }
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch bundles',
        message: errorMessage
      },
      { status: 500 }
    );
  }
}

