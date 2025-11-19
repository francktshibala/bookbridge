export const runtime = 'nodejs';
export const revalidate = 3600;

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Using singleton prisma from @/lib/prisma;

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
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
    const bookId = searchParams.get('bookId') || 'story-of-an-hour';
    const level = searchParams.get('level') || 'A1';

    // Normalize level (A1, a1, A1 -> A1)
    const normalizedLevel = level.toUpperCase();

    console.log(`📚 Fetching bundles for "${bookId}" at ${normalizedLevel} level...`);

    // Fetch book chunks from database
    const bookChunks = await prisma.bookChunk.findMany({
      where: {
        bookId: bookId,
        cefrLevel: normalizedLevel
      },
      select: {
        chunkIndex: true,
        chunkText: true,
        audioFilePath: true,
        audioDurationMetadata: true
      },
      orderBy: {
        chunkIndex: 'asc'
      }
    });

    if (bookChunks.length === 0) {
      return NextResponse.json(
        { error: `No bundles found for ${bookId} at ${normalizedLevel} level` },
        { status: 404 }
      );
    }

    // Load simplified text to extract sentences
    const cacheDir = path.join(process.cwd(), 'cache');
    const simplifiedJsonPath = path.join(cacheDir, `${bookId}-${normalizedLevel}-simplified.json`);
    
    if (!fs.existsSync(simplifiedJsonPath)) {
      return NextResponse.json(
        { error: `Simplified text not found for ${bookId} at ${normalizedLevel} level` },
        { status: 404 }
      );
    }

    const simplifiedData = JSON.parse(fs.readFileSync(simplifiedJsonPath, 'utf8'));
    const sentences = simplifiedData.sentences || simplifiedData.simplifiedSentences || [];

    // Process bundles with Solution 1 timing (cached metadata)
    const bundles: BundleMetadata[] = [];
    let totalSentencesProcessed = 0;

    bookChunks.forEach((chunk: any) => {
      // Use Solution 1: cached audioDurationMetadata for precise timings
      let sentenceTimings: any[] = [];
      let totalDuration = 0;

      if (chunk.audioDurationMetadata && typeof chunk.audioDurationMetadata === 'object') {
        const metadata = chunk.audioDurationMetadata as any;
        if (metadata.sentenceTimings && Array.isArray(metadata.sentenceTimings)) {
          sentenceTimings = metadata.sentenceTimings;
          totalDuration = metadata.measuredDuration || 0;
        }
      }

      // Fallback to estimation if no cached metadata (shouldn't happen with Solution 1)
      if (sentenceTimings.length === 0) {
        console.warn(`⚠️ No cached timing metadata for bundle ${chunk.chunkIndex}, using estimation`);
        // Fallback to splitting chunkText and estimating duration
        const sentencesFromChunkText = chunk.chunkText.split(/[.!?]+/).filter((s: string) => s.trim().length > 5);
        const estimatedDuration = sentencesFromChunkText.length * 3.5; // 3.5s per sentence estimate
        totalDuration = estimatedDuration;
        sentenceTimings = sentencesFromChunkText.map((text: string, idx: number) => ({
          sentenceIndex: totalSentencesProcessed + idx,
          text: text.trim(),
          startTime: idx * 3.5,
          endTime: (idx + 1) * 3.5,
          duration: 3.5
        }));
      }

      // Get audio URL from Supabase
      const audioUrl = supabase.storage
        .from('audio-files')
        .getPublicUrl(chunk.audioFilePath || '').data.publicUrl;

      bundles.push({
        bundleId: `bundle_${chunk.chunkIndex}`,
        bundleIndex: chunk.chunkIndex,
        audioUrl: audioUrl,
        totalDuration: parseFloat(totalDuration.toFixed(3)),
        sentences: sentenceTimings.map((timing: any) => ({
          sentenceId: `s${timing.sentenceIndex}`,
          sentenceIndex: timing.sentenceIndex,
          text: timing.text,
          startTime: timing.startTime,
          endTime: timing.endTime
        }))
      });

      totalSentencesProcessed += sentenceTimings.length;
    });

    // Get book metadata
    const bookContent = await prisma.bookContent.findFirst({
      where: { bookId: bookId }
    });

    // Load preview text and audio metadata
    let preview: string | null = null;
    let previewAudio: { audioUrl: string; duration: number } | null = null;

    // Try to load preview text from cache
    const previewTextPath = path.join(cacheDir, `${bookId}-${normalizedLevel}-preview.txt`);
    if (fs.existsSync(previewTextPath)) {
      preview = fs.readFileSync(previewTextPath, 'utf8').trim();
      console.log(`✅ Loaded preview text from cache (${preview.length} characters)`);
    }

    // Try to load preview audio metadata
    const previewAudioPath = path.join(cacheDir, `${bookId}-${normalizedLevel}-preview-audio.json`);
    if (fs.existsSync(previewAudioPath)) {
      const audioMetadata = JSON.parse(fs.readFileSync(previewAudioPath, 'utf8'));
      // Correctly access the nested 'audio.url' and 'audio.duration'
      if (audioMetadata.audio && audioMetadata.audio.url && audioMetadata.audio.duration) {
        previewAudio = {
          audioUrl: audioMetadata.audio.url,
          duration: audioMetadata.audio.duration
        };
        console.log('✅ Loaded preview audio metadata from cache (nested structure)');
      } else {
        console.log('⚠️ Preview audio metadata from cache is missing expected nested "audio.url" or "audio.duration"');
      }
    } else {
      // Fallback: Construct preview audio URL from Supabase (if file exists)
      const previewAudioFileName = `${bookId}/${normalizedLevel}/preview.mp3`;
      const { data: { publicUrl } } = supabase.storage
        .from('audio-files')
        .getPublicUrl(previewAudioFileName);

      // Check if file exists by trying to fetch it
      try {
        const testResponse = await fetch(publicUrl, { method: 'HEAD' });
        if (testResponse.ok) {
          let duration = 0;
          // Try to get duration from cache metadata if available, otherwise use 0
          try {
            const cachePath = path.join(cacheDir, `${bookId}-${normalizedLevel}-preview-audio.json`);
            if (fs.existsSync(cachePath)) {
              const metadata = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
              if (metadata.audio && metadata.audio.duration) {
                duration = metadata.audio.duration;
              }
            }
          } catch (e) {
            // Duration will be 0, measured client-side if needed
          }
          
          previewAudio = {
            audioUrl: publicUrl,
            duration
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
      bookId: bookId,
      title: bookContent?.title || 'The Story of an Hour',
      author: bookContent?.author || 'Kate Chopin',
      level: normalizedLevel,
      bundleCount: bundles.length,
      totalSentences: totalSentencesProcessed,
      bundles: bundles,
      preview: preview,
      previewAudio: previewAudio,
      audioType: 'elevenlabs'
    });

  } catch (error: any) {
    console.error('❌ Error loading The Story of an Hour bundles:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to load bundles'
    }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

