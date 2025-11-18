export const runtime = 'nodejs';
export const revalidate = 3600; // Cache for 1 hour

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

    // This API supports The Lady with the Dog for A1 level
    if (bookId !== 'lady-with-dog' && bookId !== 'lady-with-dog-a1') {
      return NextResponse.json({
        success: false,
        error: 'This API only supports The Lady with the Dog A1'
      }, {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store'
        }
      });
    }

    console.log(`🐕 Loading The Lady with the Dog bundles for level: ${level}`);

    // Get bundles from BookChunk table with audio duration metadata
    const bookChunks = await prisma.bookChunk.findMany({
      where: {
        bookId: 'lady-with-dog',
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
        error: 'No bundles found for The Lady with the Dog A1'
      }, {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store'
        }
      });
    }

    console.log(`✅ Loaded ${bookChunks.length} bundles from BookChunk table`);

    // Convert BookChunk data to API format with proper timing
    const bundles: BundleMetadata[] = [];
    let totalSentencesProcessed = 0;

    // Initialize Supabase client once
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL as string,
      process.env.SUPABASE_SERVICE_ROLE_KEY as string
    );

    bookChunks.forEach((chunk: any, index) => {
      // Generate Supabase storage URL from relative path using API, not hardcoded domain
      const audioUrl = supabase.storage
        .from('audio-files')
        .getPublicUrl(chunk.audioFilePath!)
        .data.publicUrl;

      let sentencesWithTimings;
      let totalDuration: number;

      // Check if we have cached duration metadata
      if (chunk.audioDurationMetadata && typeof chunk.audioDurationMetadata === 'object') {
        // Use cached timings (FAST PATH - 2-3 seconds)
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

            const startTime = currentTime;
            const endTime = currentTime + estimatedDuration;
            currentTime = endTime;

            return {
              sentenceId: `s${totalSentencesProcessed + sentenceIdx}`,
              sentenceIndex: totalSentencesProcessed + sentenceIdx,
              text: text.trim(),
              startTime: parseFloat(startTime.toFixed(3)),
              endTime: parseFloat(endTime.toFixed(3))
            };
          });
        }
      } else {
        // NO CACHED DATA - Use estimation fallback
        console.log(`Bundle ${index}: No cached data, using estimation`);

        const chunkSentences = chunk.chunkText
          .split(/(?<=[.!?])\s+/)
          .map((s: string) => s.trim())
          .filter((s: string) => s.length > 5);

        let cumulativeTime = 0;
        sentencesWithTimings = chunkSentences.map((text: string, sentenceIdx: number) => {
          const words = text.trim().split(/\s+/).length;
          const secondsPerWord = 0.35;
          const lengthPenalty = words > 12 ? (words - 12) * 0.03 : 0;
          const buffer = 0.20;
          const duration = words * secondsPerWord + lengthPenalty + buffer;

          const startTime = cumulativeTime;
          const endTime = startTime + duration;
          cumulativeTime = endTime;

          return {
            sentenceId: `s${totalSentencesProcessed + sentenceIdx}`,
            sentenceIndex: totalSentencesProcessed + sentenceIdx,
            text: text.trim(),
            startTime: parseFloat(startTime.toFixed(3)),
            endTime: parseFloat(endTime.toFixed(3))
          };
        });
        totalDuration = cumulativeTime;
      }

      const bundle = {
        bundleId: `bundle_${index}`,
        bundleIndex: index,
        audioUrl,
        totalDuration: parseFloat(totalDuration.toFixed(3)),
        sentences: sentencesWithTimings
      };

      bundles.push(bundle);
      totalSentencesProcessed += sentencesWithTimings.length;
    });

    // Get book metadata
    const bookContent = await prisma.bookContent.findFirst({
      where: { bookId: 'lady-with-dog' }
    });

    // Try to load preview from cache file (local) or Supabase storage (production)
    let preview: string | null = null;
    let previewAudio: { audioUrl: string; duration: number } | null = null;
    
    try {
      // Try cache file first (for local development)
      // Note: Preview text requires cache file or database migration for production
      const previewCachePath = path.join(process.cwd(), 'cache', 'lady-with-dog-A1-preview.txt');
      if (fs.existsSync(previewCachePath)) {
        preview = fs.readFileSync(previewCachePath, 'utf8').trim();
        console.log('✅ Loaded preview from cache');
      }
      
      // Try to load preview audio metadata
      const previewAudioPath = path.join(process.cwd(), 'cache', 'lady-with-dog-A1-preview-audio.json');
      if (fs.existsSync(previewAudioPath)) {
        const audioMetadata = JSON.parse(fs.readFileSync(previewAudioPath, 'utf8'));
        previewAudio = {
          audioUrl: audioMetadata.audioUrl,
          duration: audioMetadata.duration
        };
        console.log('✅ Loaded preview audio metadata from cache');
      } else {
        // Fallback: Construct preview audio URL from Supabase (works in production)
        const previewAudioFileName = 'lady-with-dog/A1/preview.mp3';
        const { data: { publicUrl } } = supabase.storage
          .from('audio-files')
          .getPublicUrl(previewAudioFileName);
        
        // Check if file exists by trying to fetch it
        try {
          const testResponse = await fetch(publicUrl, { method: 'HEAD' });
          if (testResponse.ok) {
            // Try to get duration from cache metadata if available, otherwise use 0
            let duration = 0;
            try {
              const cachePath = path.join(process.cwd(), 'cache', 'lady-with-dog-A1-preview-audio.json');
              if (fs.existsSync(cachePath)) {
                const metadata = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
                duration = metadata.duration || 0;
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
    } catch (error) {
      console.log('⚠️ Could not load preview:', error instanceof Error ? error.message : 'Unknown error');
    }

    // Load chapter data (from our chapter detection)
    let chapters = null;
    try {
      const chaptersPath = path.join(process.cwd(), 'cache', 'lady-with-dog-chapters.json');
      const chaptersData = fs.readFileSync(chaptersPath, 'utf-8');
      const chapterStructure = JSON.parse(chaptersData);

      // Convert to UI format with bundle mapping
      chapters = chapterStructure.chapters.map((ch: any, index: number) => ({
        chapterNumber: index + 1,
        title: ch.title,
        startSentence: ch.startSentence,
        endSentence: ch.endSentence,
        startBundle: Math.floor(ch.startSentence / 4), // 4 sentences per bundle
        endBundle: Math.floor(ch.endSentence / 4)
      }));
    } catch (error) {
      console.log('Could not load chapters data:', error instanceof Error ? error.message : 'Unknown error');
    }

    const totalSentences = bundles.reduce((sum, bundle) => sum + bundle.sentences.length, 0);

    return NextResponse.json({
      success: true,
      book: {
        id: bookId,
        title: bookContent?.title || 'The Lady with the Dog',
        author: bookContent?.author || 'Anton Chekhov'
      },
      level: 'A1',
      totalBundles: bundles.length,
      bundleCount: bundles.length,
      totalSentences,
      bundles,
      chapters, // Add chapter structure for UI
      preview: preview || null, // Book preview (50-100 words) for reading page
      previewAudio: previewAudio || null, // Preview audio URL and duration
      source: 'dedicated-api' // Indicates this came from dedicated API for debugging
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400'
      }
    });

  } catch (error) {
    console.error('The Lady with the Dog A1 API error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store'
      }
    });
  }
}