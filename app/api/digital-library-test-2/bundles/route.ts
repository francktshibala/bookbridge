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

    if (bookId !== 'digital-library-test-2') {
      return NextResponse.json({
        success: false,
        error: 'This API only supports digital-library-test-2'
      }, { status: 400 });
    }

    console.log(`📚 Loading digital-library-test-2 (Style Test) bundles for level: ${level}`);

    const bookChunks = await prisma.bookChunk.findMany({
      where: {
        bookId: 'digital-library-test-2',
        cefrLevel: level.toUpperCase()
      },
      orderBy: { chunkIndex: 'asc' }
    });

    if (!bookChunks || bookChunks.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No bundles found for digital-library-test-2'
      }, { status: 404 });
    }

    console.log(`✅ Loaded ${bookChunks.length} bundles from BookChunk table`);

    const bundles: BundleMetadata[] = [];
    let totalSentencesProcessed = 0;

    bookChunks.forEach((chunk, index) => {
      const audioUrl = `https://xsolwqqdbsuydwmmwtsl.supabase.co/storage/v1/object/public/audio-files/${chunk.audioFilePath}`;

      const chunkSentences = chunk.chunkText
        .split(/(?<=[.!?])\s+/)
        .map(s => s.trim())
        .filter(s => s.length > 5);

      let cumulativeTime = 0;
      const sentencesWithTimings = chunkSentences.map((text, sentenceIdx) => {
        const words = text.trim().split(/\s+/).length;
        const secondsPerWord = 0.4;
        const minDuration = 2.0;
        const duration = Math.max(words * secondsPerWord, minDuration);

        const startTime = cumulativeTime;
        const endTime = startTime + duration;
        cumulativeTime = endTime;

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

    const bookContent = await prisma.bookContent.findFirst({
      where: { bookId: 'digital-library-test-2' }
    });

    const totalSentences = bundles.reduce((sum, bundle) => sum + bundle.sentences.length, 0);

    return NextResponse.json({
      success: true,
      book: {
        id: bookId,
        title: bookContent?.title || 'Maya Story - Style Test',
        author: bookContent?.author || 'BookBridge AI'
      },
      level: level.toUpperCase(),
      totalBundles: bundles.length,
      totalSentences,
      bundles,
      source: 'dedicated-api'
    });

  } catch (error) {
    console.error('Digital Library Test-2 API error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}