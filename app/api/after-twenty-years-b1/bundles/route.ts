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

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const bookId = searchParams.get('bookId') || 'after-twenty-years';
    const level = searchParams.get('level') || 'B1';

    // Normalize level (B1, b1, B1 -> B1)
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
    const bundles = bookChunks.map((chunk) => {
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
        // Simple estimation fallback
        const bundleSentences = sentences.slice(chunk.chunkIndex * 4, (chunk.chunkIndex + 1) * 4);
        const estimatedDuration = bundleSentences.length * 3.5; // 3.5s per sentence estimate
        totalDuration = estimatedDuration;
        sentenceTimings = bundleSentences.map((s: any, idx: number) => ({
          sentenceIndex: chunk.chunkIndex * 4 + idx,
          text: s.text || s.simplified || s,
          startTime: idx * 3.5,
          endTime: (idx + 1) * 3.5,
          duration: 3.5
        }));
      }

      // Get audio URL from Supabase
      const audioUrl = supabase.storage
        .from('audio-files')
        .getPublicUrl(chunk.audioFilePath || '').data.publicUrl;

      return {
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
      };
    });

    // Get book metadata
    const bookContent = await prisma.bookContent.findFirst({
      where: { bookId: bookId }
    });

    // Calculate total sentences processed
    let totalSentencesProcessed = 0;
    bundles.forEach((bundle) => {
      totalSentencesProcessed += bundle.sentences.length;
    });

    // Load preview text and audio metadata
    let preview: string | null = null;
    let previewAudio: { audioUrl: string; duration: number } | null = null;

    // Try to load preview text from cache
    const previewTextPath = path.join(cacheDir, `${bookId}-${normalizedLevel}-preview.txt`);
    if (fs.existsSync(previewTextPath)) {
      preview = fs.readFileSync(previewTextPath, 'utf8');
      console.log('✅ Loaded preview text from cache');
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
      // Fallback: Construct preview audio URL from Supabase (works in production)
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
      }
    }

    return NextResponse.json({
      success: true,
      bookId: bookId,
      title: bookContent?.title || 'After Twenty Years',
      author: bookContent?.author || 'O. Henry',
      level: normalizedLevel,
      bundleCount: bundles.length,
      totalSentences: totalSentencesProcessed,
      bundles: bundles,
      preview: preview,
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

