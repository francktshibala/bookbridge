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
    const level = searchParams.get('level') || 'B1';

    // This API supports The Necklace for B1 level
    if (bookId !== 'the-necklace' && bookId !== 'the-necklace-b1') {
      return NextResponse.json({
        success: false,
        error: 'This API only supports The Necklace B1'
      }, {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store'
        }
      });
    }

    console.log(`💎 Loading The Necklace bundles for level: ${level}`);

    // Fast-fail check: count bundles first to avoid timeout
    const chunkCount = await prisma.bookChunk.count({
      where: {
        bookId: 'the-necklace',
        cefrLevel: 'B1'
      }
    });

    if (chunkCount === 0) {
      return NextResponse.json({
        success: false,
        error: 'No bundles found for The Necklace B1'
      }, {
        status: 404,
        headers: { 'Cache-Control': 'no-store' }
      });
    }

    // Get bundles from BookChunk table
    const bookChunks = await prisma.bookChunk.findMany({
      where: {
        bookId: 'the-necklace',
        cefrLevel: 'B1'
      },
      orderBy: { chunkIndex: 'asc' }
    });

    if (!bookChunks || bookChunks.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No bundles found for The Necklace B1'
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

    bookChunks.forEach((chunk, index) => {
      // Generate Supabase storage URL
      const audioUrl = `https://xsolwqqdbsuydwmmwtsl.supabase.co/storage/v1/object/public/audio-files/${chunk.audioFilePath}`;

      // Split chunk text into sentences with improved regex for complex B1 punctuation
      const chunkSentences = chunk.chunkText
        .split(/(?<=[.!?])\s+(?=[A-Z"]|$)/) // Split on sentence endings followed by capital letter or quote
        .map(s => s.trim())
        .filter(s => s.length > 5)
        // Further split on quote-separated sentences like "sentence!" "Another sentence."
        .flatMap(sentence => {
          // Handle cases like: "Ah, the good stew!" "I cannot imagine..."
          const quoteSplit = sentence.split(/(?<=["'][.!?])\s+(?=["'][A-Z])/);
          return quoteSplit.map(s => s.trim()).filter(s => s.length > 5);
        });

      console.log(`Bundle ${index}: ${chunkSentences.length} sentences`);

      // Calculate dynamic timings using B1-optimized formula (0.40s per word for complex sentences)
      let cumulativeTime = 0;
      const sentencesWithTimings = chunkSentences.map((text, sentenceIdx) => {
        const words = text.trim().split(/\s+/).length;
        const secondsPerWord = 0.40; // B1 timing: slower for complex sentences
        const minDuration = 2.0;     // Minimum duration for short sentences
        const duration = Math.max(words * secondsPerWord, minDuration);

        const startTime = cumulativeTime;
        const endTime = startTime + duration;
        cumulativeTime = endTime; // Update for next sentence

        return {
          sentenceId: `s${totalSentencesProcessed + sentenceIdx}`,
          sentenceIndex: totalSentencesProcessed + sentenceIdx,
          text: text.trim(),
          startTime: startTime,
          endTime: endTime
        };
      });

      const bundle = {
        bundleId: `bundle_${index}`,
        bundleIndex: index,
        audioUrl,
        totalDuration: cumulativeTime, // Use final cumulative time
        sentences: sentencesWithTimings
      };

      bundles.push(bundle);
      totalSentencesProcessed += sentencesWithTimings.length;
    });

    // Get book metadata
    const bookContent = await prisma.bookContent.findFirst({
      where: { bookId: 'the-necklace' }
    });

    // Initialize Supabase client for preview audio lookup
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL as string,
      process.env.SUPABASE_SERVICE_ROLE_KEY as string
    );

    // Try to load preview from cache file (fallback until DB migration is complete)
    let preview: string | null = null;
    let previewAudio: { audioUrl: string; duration: number } | null = null;
    
    try {
      const previewCachePath = path.join(process.cwd(), 'cache', 'the-necklace-B1-preview.txt');
      if (fs.existsSync(previewCachePath)) {
        preview = fs.readFileSync(previewCachePath, 'utf8').trim();
        console.log('✅ Loaded preview from cache');
      }
      
      // Try to load preview audio metadata
      const previewAudioPath = path.join(process.cwd(), 'cache', 'the-necklace-B1-preview-audio.json');
      if (fs.existsSync(previewAudioPath)) {
        const audioMetadata = JSON.parse(fs.readFileSync(previewAudioPath, 'utf8'));
        previewAudio = {
          audioUrl: audioMetadata.audioUrl,
          duration: audioMetadata.duration
        };
        console.log('✅ Loaded preview audio metadata from cache');
      } else {
        // Fallback: Construct preview audio URL from Supabase (if file exists)
        const previewAudioFileName = 'the-necklace/B1/preview.mp3';
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
        }
      }
    } catch (error) {
      console.log('⚠️ Could not load preview from cache:', error instanceof Error ? error.message : 'Unknown error');
    }

    // Load section data for thematic headers
    let sections = null;
    try {
      const sectionsPath = path.join(process.cwd(), 'cache', 'the-necklace-sections.json');
      const sectionsData = fs.readFileSync(sectionsPath, 'utf-8');
      sections = JSON.parse(sectionsData).sections;
    } catch (error) {
      console.log('Could not load sections data:', error instanceof Error ? error.message : 'Unknown error');
    }

    const totalSentences = bundles.reduce((sum, bundle) => sum + bundle.sentences.length, 0);

    return NextResponse.json({
      success: true,
      book: {
        id: bookId,
        title: bookContent?.title || 'The Necklace',
        author: bookContent?.author || 'Guy de Maupassant'
      },
      level: 'B1',
      totalBundles: bundles.length,
      bundleCount: bundles.length,
      totalSentences,
      bundles,
      sections, // Add thematic sections for UI
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
    console.error('The Necklace B1 API error:', error);
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