export const runtime = 'nodejs';
export const revalidate = 3600;

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Using singleton prisma from @/lib/prisma;

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

    // This API supports After Twenty Years for A1 level
    if (bookId !== 'after-twenty-years' && bookId !== 'after-twenty-years-a1') {
      return NextResponse.json({
        success: false,
        error: 'This API only supports After Twenty Years A1'
      }, { status: 400 });
    }

    console.log(`💎 Loading After Twenty Years bundles for level: ${level}`);

    // Initialize Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL as string,
      process.env.SUPABASE_SERVICE_ROLE_KEY as string
    );

    // Get bundles from BookChunk table with audio duration metadata (Solution 1)
    const bookChunks = await prisma.bookChunk.findMany({
      where: {
        bookId: 'after-twenty-years',
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
        error: 'No bundles found for After Twenty Years A1'
      }, { status: 404 });
    }

    console.log(`✅ Loaded ${bookChunks.length} bundles from BookChunk table`);

    // Convert BookChunk data to API format with proper timing (Solution 1)
    const bundles: BundleMetadata[] = [];
    let totalSentencesProcessed = 0;

    bookChunks.forEach((chunk: any, index) => {
      // Generate Supabase storage URL from relative path
      const audioUrl = supabase.storage
        .from('audio-files')
        .getPublicUrl(chunk.audioFilePath!)
        .data.publicUrl;

      let sentencesWithTimings;
      let totalDuration: number;

      // Check if we have cached duration metadata (Solution 1)
      if (chunk.audioDurationMetadata && typeof chunk.audioDurationMetadata === 'object') {
        // Use cached timings (FAST PATH - 2-3 seconds)
        const metadata = chunk.audioDurationMetadata as any;
        console.log(`Bundle ${index}: Using cached duration ${metadata.measuredDuration?.toFixed(3)}s`);

        totalDuration = metadata.measuredDuration || 0;

        // Use cached sentence timings if available
        if (metadata.sentenceTimings && Array.isArray(metadata.sentenceTimings)) {
          sentencesWithTimings = metadata.sentenceTimings.map((timing: any, idx: number) => ({
            sentenceId: `s${timing.sentenceIndex}`,
            sentenceIndex: timing.sentenceIndex, // Use original index (no double-offset)
            text: timing.text,
            startTime: timing.startTime,
            endTime: timing.endTime
          }));
        } else {
          // Fallback: estimate from total duration
          const sentences = chunk.chunkText.split(/[.!?]+/).filter((s: string) => s.trim().length > 5);
          const avgDuration = totalDuration / sentences.length;
          sentencesWithTimings = sentences.map((text: string, idx: number) => ({
            sentenceId: `s${totalSentencesProcessed + idx}`,
            sentenceIndex: totalSentencesProcessed + idx,
            text: text.trim(),
            startTime: idx * avgDuration,
            endTime: (idx + 1) * avgDuration
          }));
        }
      } else {
        // Fallback: estimate timing (should not happen with Solution 1)
        console.warn(`Bundle ${index}: No cached metadata, using estimation (not ideal)`);
        const sentences = chunk.chunkText.split(/[.!?]+/).filter((s: string) => s.trim().length > 5);
        const estimatedDuration = chunk.wordCount * 0.4; // Rough estimate
        const avgDuration = estimatedDuration / sentences.length;
        totalDuration = estimatedDuration;
        sentencesWithTimings = sentences.map((text: string, idx: number) => ({
          sentenceId: `s${totalSentencesProcessed + idx}`,
          sentenceIndex: totalSentencesProcessed + idx,
          text: text.trim(),
          startTime: idx * avgDuration,
          endTime: (idx + 1) * avgDuration
        }));
      }

      bundles.push({
        bundleId: `bundle_${chunk.chunkIndex}`,
        bundleIndex: chunk.chunkIndex,
        audioUrl,
        totalDuration: parseFloat(totalDuration.toFixed(3)),
        sentences: sentencesWithTimings
      });

      totalSentencesProcessed += sentencesWithTimings.length;
    });

    // Get book metadata
    const bookContent = await prisma.bookContent.findFirst({
      where: { bookId: 'after-twenty-years' }
    });

    // Load preview text from cache (local development)
    let previewText: string | null = null;
    const previewTextPath = path.join(process.cwd(), 'cache', 'after-twenty-years-A1-preview.txt');
    if (fs.existsSync(previewTextPath)) {
      previewText = fs.readFileSync(previewTextPath, 'utf8').trim();
      console.log(`✅ Loaded preview text from cache (${previewText.length} characters)`);
    }

    // Load preview audio metadata from cache (local development)
    let previewAudio: { audioUrl: string; duration: number } | null = null;
    const previewAudioPath = path.join(process.cwd(), 'cache', 'after-twenty-years-A1-preview-audio.json');
    if (fs.existsSync(previewAudioPath)) {
      const audioMetadata = JSON.parse(fs.readFileSync(previewAudioPath, 'utf8'));
      // Handle both nested (audio.url) and flat (audioUrl) structures
      const audioUrl = audioMetadata.audio?.url || audioMetadata.audioUrl;
      const duration = audioMetadata.audio?.duration || audioMetadata.duration;
      if (audioUrl) {
        previewAudio = {
          audioUrl: audioUrl,
          duration: duration || 0
        };
        console.log('✅ Loaded preview audio metadata from cache');
      }
    } else {
      // Fallback: Construct preview audio URL from Supabase (if file exists)
      const previewAudioFileName = 'after-twenty-years/A1/preview.mp3';
      const { data: { publicUrl } } = supabase.storage
        .from('audio-files')
        .getPublicUrl(previewAudioFileName);
      
      // Check if file exists by trying to fetch it
      try {
        const testResponse = await fetch(publicUrl, { method: 'HEAD' });
        if (testResponse.ok) {
          previewAudio = {
            audioUrl: publicUrl,
            duration: 0 // Will be measured client-side if needed
          };
          console.log('✅ Found preview audio in Supabase storage');
        }
      } catch (error) {
        // File doesn't exist, that's okay
        console.log('⚠️ Preview audio not found in Supabase storage');
      }
    }

    return NextResponse.json({
      success: true,
      bookId: 'after-twenty-years',
      title: bookContent?.title || 'After Twenty Years',
      author: bookContent?.author || 'O. Henry',
      level: 'A1',
      bundleCount: bundles.length,
      totalSentences: totalSentencesProcessed,
      bundles: bundles,
      preview: previewText,
      previewAudio: previewAudio,
      audioType: 'elevenlabs'
    });

  } catch (error: any) {
    console.error('❌ Error loading After Twenty Years bundles:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to load bundles'
    }, { status: 500 });
  }
}

