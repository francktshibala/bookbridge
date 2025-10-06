import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface ChristmasCarolBundle {
  bundleId: number;
  sentences: string[];
}

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

    // This API is specifically for Christmas Carol Enhanced v2
    if (bookId !== 'christmas-carol-enhanced-v2') {
      return NextResponse.json({
        success: false,
        error: 'This API only supports Christmas Carol Enhanced v2'
      }, { status: 400 });
    }

    console.log(`🎄 Loading Christmas Carol bundles for level: ${level}`);

    // Get bundles from BookChunk table (like Jekyll but using BookChunk architecture)
    const bookChunks = await prisma.bookChunk.findMany({
      where: {
        bookId: 'christmas-carol-enhanced-v2',
        cefrLevel: 'A1'
      },
      orderBy: { chunkIndex: 'asc' }
    });

    if (!bookChunks || bookChunks.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No bundles found for Christmas Carol Enhanced v2'
      }, { status: 404 });
    }

    console.log(`✅ Loaded ${bookChunks.length} bundles from BookChunk table`);

    // Convert BookChunk data to API format with CORRECTED timing (fix overlaps)
    const bundles: BundleMetadata[] = bookChunks.map((chunk, index) => {
      // Generate Supabase storage URL
      const audioUrl = `https://xsolwqqdbsuydwmmwtsl.supabase.co/storage/v1/object/public/audio-files/${chunk.audioFilePath}`;

      // Split chunk text into sentences (4 per chunk)
      const chunkSentences = chunk.chunkText
        .split(/(?<=[.!?])\s+/)
        .map(s => s.trim())
        .filter(s => s.length > 5);

      // Calculate dynamic timings with PROPER cumulative timing (no overlaps)
      let cumulativeTime = 0;
      const sentencesWithTimings = chunkSentences.map((text, sentenceIdx) => {
        const words = text.trim().split(/\s+/).length;
        const secondsPerWord = 0.4; // Same as Jekyll
        const minDuration = 2.0;    // Same as Jekyll
        const duration = Math.max(words * secondsPerWord, minDuration);

        const startTime = cumulativeTime;
        const endTime = startTime + duration;
        cumulativeTime = endTime; // Update for next sentence

        return {
          sentenceId: `s${index * 4 + sentenceIdx}`,
          sentenceIndex: index * 4 + sentenceIdx,
          text: text.trim(),
          startTime: startTime,
          endTime: endTime
        };
      });

      return {
        bundleId: `bundle_${index}`,
        bundleIndex: index,
        audioUrl,
        totalDuration: cumulativeTime, // Use final cumulative time
        sentences: sentencesWithTimings
      };
    });

    // Get book metadata
    const bookContent = await prisma.bookContent.findFirst({
      where: { bookId: 'christmas-carol-enhanced-v2' }
    });

    const totalSentences = bundles.reduce((sum, bundle) => sum + bundle.sentences.length, 0);

    return NextResponse.json({
      success: true,
      book: {
        id: bookId,
        title: bookContent?.title || 'A Christmas Carol (Enhanced)',
        author: bookContent?.author || 'Charles Dickens'
      },
      level: 'A1',
      totalBundles: bundles.length,
      totalSentences,
      bundles,
      source: 'dedicated-api' // Indicates this came from dedicated API for debugging
    });

  } catch (error) {
    console.error('Christmas Carol API error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}