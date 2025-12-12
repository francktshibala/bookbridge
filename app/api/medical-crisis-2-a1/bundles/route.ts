export const runtime = 'nodejs';
export const revalidate = 3600;

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string
);

interface BundleSentence {
  text: string;
  startTime: number;
  endTime: number;
  duration: number;
  sentenceIndex: number;
}

interface BundleMetadata {
  bundleId: string;
  bundleIndex: number;
  audioUrl: string;
  totalDuration: number;
  sentences: BundleSentence[];
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const bookId = searchParams.get('bookId');
    const level = searchParams.get('level') || 'A1';

    if (bookId !== 'medical-crisis-2' && bookId !== 'medical-crisis-2-a1') {
      return NextResponse.json(
        { success: false, error: 'This API only supports Medical Crisis #2 Story A1' },
        { status: 400 }
      );
    }

    console.log(`🎤 Loading "Impossible Possible: Overcoming Medical Crisis" bundles for level: ${level}`);

    const bookChunks = await prisma.bookChunk.findMany({
      where: {
        bookId: 'medical-crisis-2',
        cefrLevel: 'A1'
      },
      orderBy: {
        chunkIndex: 'asc'
      },
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
      return NextResponse.json(
        { success: false, error: 'No bundles found for Medical Crisis #2 Story A1' },
        { status: 404 }
      );
    }

    const bundles: BundleMetadata[] = [];
    let totalSentencesProcessed = 0;

    bookChunks.forEach((chunk: any, index) => {
      let audioUrl = supabase.storage
        .from('audio-files')
        .getPublicUrl(chunk.audioFilePath!).data.publicUrl;

      const audioMetadata = chunk.audioDurationMetadata as any;
      const totalDuration = audioMetadata?.measuredDuration || 0;

      const sentencesWithTimings: BundleSentence[] = [];
      if (audioMetadata?.sentenceTimings && Array.isArray(audioMetadata.sentenceTimings)) {
        audioMetadata.sentenceTimings.forEach((timing: any) => {
          sentencesWithTimings.push({
            text: timing.text || '',
            startTime: timing.startTime || 0,
            endTime: timing.endTime || 0,
            duration: timing.duration || 0,
            sentenceIndex: timing.sentenceIndex !== undefined ? timing.sentenceIndex : sentencesWithTimings.length
          });
        });
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

    // Load combined preview text and audio
    const cacheDir = path.join(process.cwd(), 'cache');
    const previewCombinedTextPath = path.join(cacheDir, 'medical-crisis-2-A1-preview-combined.txt');
    const previewCombined = fs.existsSync(previewCombinedTextPath)
      ? fs.readFileSync(previewCombinedTextPath, 'utf8').trim()
      : null;

    const previewCombinedAudioPath = path.join(cacheDir, 'medical-crisis-2-A1-preview-combined-audio.json');
    let previewCombinedAudio: {
      audioUrl: string;
      duration: number;
      sentenceTimings?: Array<{ startTime: number; endTime: number; duration: number; text: string }> | null;
    } | null = null;

    if (fs.existsSync(previewCombinedAudioPath)) {
      const audioMetadata = JSON.parse(fs.readFileSync(previewCombinedAudioPath, 'utf8'));
      if (audioMetadata.audio && audioMetadata.audio.url && audioMetadata.audio.duration) {
        previewCombinedAudio = {
          audioUrl: audioMetadata.audio.url,
          duration: audioMetadata.audio.duration,
          sentenceTimings: audioMetadata.audio.sentenceTimings || null
        };
      }
    }

    return NextResponse.json(
      {
        success: true,
        bookId: 'medical-crisis-2',
        title: 'Impossible Possible: Overcoming Medical Crisis',
        author: 'BookBridge',
        level: 'A1',
        bundles: bundles,
        bundleCount: bundles.length,
        totalBundles: bundles.length,
        totalSentences: totalSentencesProcessed,
        previewCombined: previewCombined,
        previewCombinedAudio: previewCombinedAudio,
        audioType: 'elevenlabs'
      },
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400'
        }
      }
    );

  } catch (error) {
    console.error('❌ Error loading Medical Crisis #2 Story bundles:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to load bundles',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

