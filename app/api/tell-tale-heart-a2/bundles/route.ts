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
    const level = searchParams.get('level') || 'A2';

    // This API supports The Tell-Tale Heart for A2 level
    if (bookId !== 'tell-tale-heart' && bookId !== 'tell-tale-heart-a2') {
      return NextResponse.json({
        success: false,
        error: 'This API only supports The Tell-Tale Heart A2'
      }, { status: 400 });
    }

    console.log(`💎 Loading The Tell-Tale Heart bundles for level: ${level}`);

    // Initialize Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL as string,
      process.env.SUPABASE_SERVICE_ROLE_KEY as string
    );

    // Get bundles from BookChunk table with audio duration metadata (Solution 1)
    const bookChunks = await prisma.bookChunk.findMany({
      where: {
        bookId: 'tell-tale-heart',
        cefrLevel: 'A2'
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
        error: 'No bundles found for The Tell-Tale Heart A2'
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
      where: { bookId: 'tell-tale-heart' }
    });

    // Try to load preview from cache file (same pattern as The Necklace)
    let preview: string | null = null;
    let previewAudio: { audioUrl: string; duration: number } | null = null;
    
    try {
      const previewCachePath = path.join(process.cwd(), 'cache', 'tell-tale-heart-A2-preview.txt');
      if (fs.existsSync(previewCachePath)) {
        preview = fs.readFileSync(previewCachePath, 'utf8').trim();
        console.log('✅ Loaded preview from cache');
      }
      
      // Try to load preview audio metadata
      const previewAudioPath = path.join(process.cwd(), 'cache', 'tell-tale-heart-A2-preview-audio.json');
      if (fs.existsSync(previewAudioPath)) {
        const audioMetadata = JSON.parse(fs.readFileSync(previewAudioPath, 'utf8'));
        previewAudio = {
          audioUrl: audioMetadata.audioUrl,
          duration: audioMetadata.duration
        };
        console.log('✅ Loaded preview audio metadata from cache');
      } else {
        // Fallback: Construct preview audio URL from Supabase (works in production)
        const previewAudioFileName = 'tell-tale-heart/A2/preview.mp3';
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
              const cachePath = path.join(process.cwd(), 'cache', 'tell-tale-heart-A2-preview-audio.json');
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

    // Load chapter data for thematic headers (short story - use thematic sections)
    let chapters = null;
    try {
      const chaptersPath = path.join(process.cwd(), 'cache', 'tell-tale-heart-chapters.json');
      if (fs.existsSync(chaptersPath)) {
        const chaptersData = fs.readFileSync(chaptersPath, 'utf-8');
        chapters = JSON.parse(chaptersData).chapters;
      }
    } catch (error) {
      console.log('Could not load chapters data:', error instanceof Error ? error.message : 'Unknown error');
    }

    const totalSentences = bundles.reduce((sum, bundle) => sum + bundle.sentences.length, 0);

    return NextResponse.json({
      success: true,
      book: {
        id: 'tell-tale-heart',
        title: bookContent?.title || 'The Tell-Tale Heart',
        author: bookContent?.author || 'Edgar Allan Poe'
      },
      level: 'A2',
      totalBundles: bundles.length,
      bundleCount: bundles.length,
      totalSentences,
      bundles,
      chapters, // Add thematic sections for UI
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
    console.error('The Tell-Tale Heart A2 API error:', error);
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

