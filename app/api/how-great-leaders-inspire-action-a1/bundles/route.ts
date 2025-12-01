export const runtime = 'nodejs';
export const revalidate = 3600; // Cache for 1 hour

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Initialize Supabase client for audio URL generation
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string
);

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
    const searchParams = request.nextUrl.searchParams;
    const bookId = searchParams.get('bookId');
    const level = searchParams.get('level') || 'A1';

    // This API supports "How Great Leaders Inspire Action" TED Talk for A1 level
    if (bookId !== 'how-great-leaders-inspire-action' && bookId !== 'how-great-leaders-inspire-action-a1') {
      return NextResponse.json({
        success: false,
        error: 'This API only supports How Great Leaders Inspire Action A1'
      }, {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store'
        }
      });
    }

    console.log(`🎤 Loading "How Great Leaders Inspire Action" bundles for level: ${level}`);

    // Fast-fail check: count bundles first to avoid timeout
    const chunkCount = await prisma.bookChunk.count({
      where: {
        bookId: 'how-great-leaders-inspire-action',
        cefrLevel: 'A1'
      }
    });

    if (chunkCount === 0) {
      return NextResponse.json({
        success: false,
        error: 'No bundles found for How Great Leaders Inspire Action A1'
      }, {
        status: 404,
        headers: { 'Cache-Control': 'no-store' }
      });
    }

    console.log(`📊 Found ${chunkCount} bundles in database`);

    // Get bundles from BookChunk table with audio duration metadata
    const bookChunks = await prisma.bookChunk.findMany({
      where: {
        bookId: 'how-great-leaders-inspire-action',
        cefrLevel: 'A1'
      },
      orderBy: { chunkIndex: 'asc' },
      select: {
        id: true,
        bookId: true,
        cefrLevel: true,
        chunkIndex: true,
        chunkText: true,
        wordCount: true,
        audioFilePath: true,
        audioDurationMetadata: true
      }
    });

    if (!bookChunks || bookChunks.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No bundles found for How Great Leaders Inspire Action A1'
      }, {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store'
        }
      });
    }

    console.log(`✅ Loaded ${bookChunks.length} bundles from BookChunk table`);

    // Convert BookChunk data to API format with cached timing (Solution 1)
    const bundles: BundleMetadata[] = [];
    let totalSentencesProcessed = 0;

    bookChunks.forEach((chunk: any, index) => {
      // Generate Supabase storage URL from relative path using API
      const audioUrl = supabase.storage
        .from('audio-files')
        .getPublicUrl(chunk.audioFilePath!)
        .data.publicUrl;

      let sentencesWithTimings;
      let totalDuration: number;

      // Check if we have cached duration metadata (Solution 1 - FAST PATH)
      if (chunk.audioDurationMetadata && typeof chunk.audioDurationMetadata === 'object') {
        const metadata = chunk.audioDurationMetadata as any;
        console.log(`Bundle ${index}: Using cached duration ${metadata.measuredDuration?.toFixed(3)}s`);

        totalDuration = metadata.measuredDuration || 0;

        // Use cached sentence timings if available
        if (metadata.sentenceTimings && Array.isArray(metadata.sentenceTimings)) {
          sentencesWithTimings = metadata.sentenceTimings.map((timing: any, idx: number) => ({
            sentenceId: `s${totalSentencesProcessed + idx}`,
            sentenceIndex: totalSentencesProcessed + idx,
            text: timing.text,
            startTime: timing.startTime,
            endTime: timing.endTime
          }));
        } else {
          // Fallback: split text and use proportional timing from cached duration
          const chunkSentences = chunk.chunkText
            .split(/(?<=[.!?])\s+/)
            .map((s: string) => s.trim())
            .filter((s: string) => s.length > 5);

          const totalWords = chunkSentences.reduce((sum: number, sentence: string) =>
            sum + sentence.split(/\s+/).length, 0
          );

          let currentTime = 0;
          sentencesWithTimings = chunkSentences.map((text: string, sentenceIdx: number) => {
            const words = text.trim().split(/\s+/).length;
            const wordRatio = words / totalWords;
            const estimatedDuration = totalDuration * wordRatio;

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
        }
      } else {
        // No cached metadata - estimate using Daniel voice timing (0.85× speed)
        console.warn(`Bundle ${index}: No cached duration metadata, estimating...`);
        const chunkSentences = chunk.chunkText
          .split(/(?<=[.!?])\s+/)
          .map((s: string) => s.trim())
          .filter((s: string) => s.length > 5);

        const baseSecondsPerWord = 0.40; // Daniel voice base rate
        const speed = 0.85; // FFmpeg slowdown applied

        let currentTime = 0;
        sentencesWithTimings = chunkSentences.map((text: string, sentenceIdx: number) => {
          const words = text.split(/\s+/).length;
          const baseDuration = (words * baseSecondsPerWord) / speed;

          // Punctuation penalties
          const punctuationBonus = text.match(/[.!?]$/) ? 0.3 : 0;

          const estimatedDuration = baseDuration + punctuationBonus + 0.2; // safety buffer

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
    const previewTextPath = path.join(cacheDir, 'how-great-leaders-inspire-action-A1-preview.txt');
    if (fs.existsSync(previewTextPath)) {
      preview = fs.readFileSync(previewTextPath, 'utf8').trim();
      console.log(`✅ Loaded preview text from cache (${preview.length} characters)`);
    }

    // Load preview audio metadata
    const previewAudioPath = path.join(cacheDir, 'how-great-leaders-inspire-action-A1-preview-audio.json');
    if (fs.existsSync(previewAudioPath)) {
      const audioMetadata = JSON.parse(fs.readFileSync(previewAudioPath, 'utf8'));
      if (audioMetadata.audio && audioMetadata.audio.url && audioMetadata.audio.duration) {
        previewAudio = {
          audioUrl: audioMetadata.audio.url,
          duration: audioMetadata.audio.duration
        };
        console.log('✅ Loaded preview audio metadata from cache');
      }
    }

    return NextResponse.json({
      success: true,
      bookId: 'how-great-leaders-inspire-action',
      title: 'How Great Leaders Inspire Action',
      author: 'Simon Sinek',
      level: 'A1',
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
        'Cache-Control': 'public, max-age=3600' // Cache for 1 hour
      }
    });

  } catch (error: any) {
    console.error('❌ Error loading How Great Leaders Inspire Action bundles:', error);

    return NextResponse.json({
      success: false,
      error: 'Failed to load bundles',
      details: error.message
    }, {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store'
      }
    });
  }
}
