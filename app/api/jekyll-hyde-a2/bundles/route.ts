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

    // This API is specifically for Jekyll & Hyde A2
    if (bookId !== 'gutenberg-43') {
      return NextResponse.json({
        success: false,
        error: 'This API only supports Jekyll & Hyde A2'
      }, { status: 400 });
    }

    console.log(`🎭 Loading Jekyll & Hyde A2 bundles with natural compound sentences...`);

    // Get A2 bundles from BookChunk table
    const bookChunks = await prisma.bookChunk.findMany({
      where: {
        bookId: 'gutenberg-43',
        cefrLevel: 'A2'
      },
      orderBy: { chunkIndex: 'asc' }
    });

    if (!bookChunks || bookChunks.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No A2 bundles found for Jekyll & Hyde'
      }, { status: 404 });
    }

    console.log(`✅ Loaded ${bookChunks.length} A2 bundles with natural compound sentences`);

    // Convert BookChunk data to API format with perfect timing
    const bundles: BundleMetadata[] = [];
    let totalSentencesProcessed = 0;

    bookChunks.forEach((chunk, index) => {
      // Generate Supabase storage URL
      const audioUrl = `https://xsolwqqdbsuydwmmwtsl.supabase.co/storage/v1/object/public/audio-files/${chunk.audioFilePath}`;

      // Split chunk text into sentences (preserving punctuation)
      const chunkSentences = chunk.chunkText
        .split(/(?<=[.!?])\s+/)
        .map(s => s.trim())
        .filter(s => s.length > 5);

      console.log(`Bundle ${index}: ${chunkSentences.length} sentences (A2 natural compound)`);

      // Calculate timing with perfect cumulative progression
      let cumulativeTime = 0;
      const sentencesWithTimings = chunkSentences.map((text, sentenceIdx) => {
        const words = text.trim().split(/\s+/).length;
        const secondsPerWord = 0.4; // Standard timing
        const minDuration = 2.0;    // Minimum duration
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
        totalDuration: cumulativeTime,
        sentences: sentencesWithTimings
      };

      bundles.push(bundle);
      totalSentencesProcessed += sentencesWithTimings.length;
    });

    // Get book metadata
    const bookContent = await prisma.bookContent.findFirst({
      where: { bookId: 'gutenberg-43-A2' }
    });

    const totalSentences = bundles.reduce((sum, bundle) => sum + bundle.sentences.length, 0);

    return NextResponse.json({
      success: true,
      book: {
        id: bookId,
        title: bookContent?.title || 'Dr. Jekyll and Mr. Hyde (A2)',
        author: bookContent?.author || 'Robert Louis Stevenson'
      },
      level: 'A2',
      totalBundles: bundles.length,
      totalSentences,
      bundles,
      source: 'dedicated-api-a2',
      voiceSettings: 'Daniel voice + speed 0.90'
    });

  } catch (error) {
    console.error('Jekyll Hyde A2 API error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}