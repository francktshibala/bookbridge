import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

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

export async function GET(request: NextRequest) {
  try {
    console.log(`📚 Fetching A2 bundles for "How Great Leaders Inspire Action"...`);

    const bookChunks = await prisma.bookChunk.findMany({
      where: {
        bookId: 'how-great-leaders-inspire-action',
        cefrLevel: 'A2'
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

    // Convert BookChunk data to API format with cached timing (Solution 1)
    const bundles: BundleMetadata[] = [];
    let totalSentencesProcessed = 0;

    bookChunks.forEach((chunk: any, index) => {
      // Generate audio URL from relative path
      const audioUrl = `/audio-files/${chunk.audioFilePath}`;

      let sentencesWithTimings;
      let totalDuration: number;

      // Check if we have cached duration metadata (Solution 1 - FAST PATH)
      if (chunk.audioDurationMetadata && typeof chunk.audioDurationMetadata === 'object') {
        const metadata = chunk.audioDurationMetadata as any;
        totalDuration = metadata.measuredDuration || 0;

        // Use cached sentence timings if available
        if (metadata.sentenceTimings && Array.isArray(metadata.sentenceTimings)) {
          sentencesWithTimings = metadata.sentenceTimings.map((timing: any, idx: number) => ({
            sentenceId: `s${totalSentencesProcessed + idx}`,
            sentenceIndex: totalSentencesProcessed + idx,
            text: timing.text,
            startTime: timing.start,
            endTime: timing.end
          }));
        } else {
          // Fallback: split text and use proportional timing from cached duration
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
        // No cached metadata - estimate using Jane voice timing (0.85× speed)
        console.warn(`Bundle ${index}: No cached duration metadata, estimating...`);
        const chunkSentences = chunk.chunkText
          .split(/(?<=[.!?])\s+/)
          .map((s: string) => s.trim())
          .filter((s: string) => s.length > 5);

        const baseSecondsPerWord = 0.40; // Jane voice base rate
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

    // Load preview text and audio from cache
    let preview: string | null = null;
    let previewAudio: { audioUrl: string; duration: number } | null = null;

    const cacheDir = path.join(process.cwd(), 'cache');

    // Load preview text
    const previewTextPath = path.join(cacheDir, 'how-great-leaders-inspire-action-A2-preview.txt');
    if (fs.existsSync(previewTextPath)) {
      preview = fs.readFileSync(previewTextPath, 'utf8').trim();
      console.log(`✅ Loaded A2 preview text from cache (${preview.length} characters)`);
    }

    // Load preview audio metadata
    const previewAudioPath = path.join(cacheDir, 'how-great-leaders-inspire-action-A2-preview-audio.json');
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
      bookId: 'how-great-leaders-inspire-action',
      title: 'How Great Leaders Inspire Action',
      author: 'Simon Sinek',
      level: 'A2',
      bundles: bundles,
      bundleCount: bundles.length,
      totalBundles: bundles.length,
      totalSentences: totalSentencesProcessed,
      totalDurationMinutes: parseFloat(totalDurationMinutes.toFixed(2)),
      preview: preview,
      previewAudio: previewAudio,
      audioType: 'elevenlabs'
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600'
      }
    });

  } catch (error) {
    console.error('❌ Error fetching A2 bundles:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch bundles',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
