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

    // This API supports "Teen Translating for Parents Through Hospital Chaos" for A1 level
    if (bookId !== 'teen-translating-hospital' && bookId !== 'teen-translating-hospital-a1') {
      return NextResponse.json({
        success: false,
        error: 'This API only supports Teen Translating for Parents Through Hospital Chaos A1'
      }, {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store'
        }
      });
    }

    console.log(`🎤 Loading "Teen Translating for Parents Through Hospital Chaos" bundles for level: ${level}`);

    // Fast-fail check: count bundles first to avoid timeout
    const chunkCount = await prisma.bookChunk.count({
      where: {
        bookId: 'teen-translating-hospital',
        cefrLevel: 'A1'
      }
    });

    if (chunkCount === 0) {
      return NextResponse.json({
        success: false,
        error: 'No bundles found for Teen Translating for Parents Through Hospital Chaos A1'
      }, {
        status: 404,
        headers: { 'Cache-Control': 'no-store' }
      });
    }

    console.log(`📊 Found ${chunkCount} bundles in database`);

    // Get bundles from BookChunk table with audio duration metadata
    const bookChunks = await prisma.bookChunk.findMany({
      where: {
        bookId: 'teen-translating-hospital',
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
        error: 'No bundles found for Teen Translating for Parents Through Hospital Chaos A1'
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
        // No cached metadata - estimate using Enhanced Timing v3
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

    // Load combined preview text and audio from cache (Preview + Hook + Background combined)
    let previewCombined: string | null = null;
    let previewCombinedAudio: { 
      audioUrl: string; 
      duration: number; 
      sentenceTimings?: Array<{ startTime: number; endTime: number; duration: number; text: string }> | null 
    } | null = null;

    const cacheDir = path.join(process.cwd(), 'cache');

    // Load combined preview text (Preview + Hook + Background)
    const previewCombinedTextPath = path.join(cacheDir, 'teen-translating-hospital-A1-preview-combined.txt');
    if (fs.existsSync(previewCombinedTextPath)) {
      previewCombined = fs.readFileSync(previewCombinedTextPath, 'utf8').trim();
      console.log(`✅ Loaded combined preview text from cache (${previewCombined.length} characters)`);
    }

    // Load combined preview audio metadata (Preview + Hook + Background)
    const previewCombinedAudioPath = path.join(cacheDir, 'teen-translating-hospital-A1-preview-combined-audio.json');
    if (fs.existsSync(previewCombinedAudioPath)) {
      const audioMetadata = JSON.parse(fs.readFileSync(previewCombinedAudioPath, 'utf8'));
      if (audioMetadata.audio && audioMetadata.audio.url && audioMetadata.audio.duration) {
        previewCombinedAudio = {
          audioUrl: audioMetadata.audio.url,
          duration: audioMetadata.audio.duration,
          sentenceTimings: audioMetadata.audio.sentenceTimings || null
        };
        console.log('✅ Loaded combined preview audio metadata from cache');
        if (audioMetadata.audio.sentenceTimings) {
          console.log(`   📊 Found ${audioMetadata.audio.sentenceTimings.length} pre-calculated sentence timings`);
        }
      }
    }

    return NextResponse.json({
      success: true,
      bookId: 'teen-translating-hospital',
      title: 'A Lifeline: Teen Translating for Parents Through Hospital Chaos',
      author: 'BookBridge',
      level: 'A1',
      bundles: bundles,
      bundleCount: bundles.length,
      totalBundles: bundles.length,
      totalSentences: totalSentencesProcessed,
      previewCombined: previewCombined,
      previewCombinedAudio: previewCombinedAudio,
      audioType: 'elevenlabs'
    }, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400'
      }
    });

  } catch (error) {
    console.error('❌ Error loading Teen Translating bundles:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to load bundles',
      details: error instanceof Error ? error.message : String(error)
    }, {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store'
      }
    });
  }
}

