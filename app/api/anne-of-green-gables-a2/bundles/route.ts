export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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

    // This API is specifically for Anne of Green Gables A2
    if (bookId !== 'anne-of-green-gables-a2') {
      return NextResponse.json({
        success: false,
        error: 'This API only supports Anne of Green Gables A2'
      }, { status: 400 });
    }

    console.log(`📚 Loading Anne of Green Gables bundles for level: ${level}`);

    // Get bundles from BookChunk table
    const bookChunks = await prisma.bookChunk.findMany({
      where: {
        bookId: 'anne-of-green-gables-a2',
        cefrLevel: 'A2'
      },
      orderBy: { chunkIndex: 'asc' }
    });

    if (!bookChunks || bookChunks.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No bundles found for Anne of Green Gables A2'
      }, { status: 404 });
    }

    console.log(`✅ Loaded ${bookChunks.length} bundles from BookChunk table`);

    // Convert BookChunk data to API format with proper timing
    const bundles: BundleMetadata[] = [];
    let totalSentencesProcessed = 0;

    bookChunks.forEach((chunk, index) => {
      // Generate Supabase storage URL
      const audioUrl = `https://xsolwqqdbsuydwmmwtsl.supabase.co/storage/v1/object/public/audio-files/${chunk.audioFilePath}`;

      // Split chunk text into sentences
      const chunkSentences = chunk.chunkText
        .split(/(?<=[.!?])\s+/)
        .map(s => s.trim())
        .filter(s => s.length > 5);

      console.log(`Bundle ${index}: ${chunkSentences.length} sentences`);

      // Calculate dynamic timings using Daniel voice formula (0.32s per word)
      let cumulativeTime = 0;
      const sentencesWithTimings = chunkSentences.map((text, sentenceIdx) => {
        const words = text.trim().split(/\s+/).length;
        const secondsPerWord = 0.32; // Daniel voice timing from Master Prevention
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
      where: { bookId: 'anne-of-green-gables-a2' }
    });

    const totalSentences = bundles.reduce((sum, bundle) => sum + bundle.sentences.length, 0);

    return NextResponse.json({
      success: true,
      book: {
        id: bookId,
        title: bookContent?.title || 'Anne of Green Gables',
        author: bookContent?.author || 'L. M. Montgomery'
      },
      level: 'A2',
      totalBundles: bundles.length,
      totalSentences,
      bundles,
      source: 'dedicated-api' // Indicates this came from dedicated API for debugging
    });

  } catch (error) {
    console.error('Anne of Green Gables API error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}