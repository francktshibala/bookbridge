import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';

const prisma = new PrismaClient();

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

    // This API supports The Metamorphosis for A1 level
    if (bookId !== 'the-metamorphosis' && bookId !== 'the-metamorphosis-a1') {
      return NextResponse.json({
        success: false,
        error: 'This API only supports The Metamorphosis A1'
      }, { status: 400 });
    }

    console.log(`🐛 Loading The Metamorphosis bundles for level: ${level}`);

    // Get bundles from BookChunk table with audio duration metadata (SOLUTION 1)
    const bookChunks = await prisma.bookChunk.findMany({
      where: {
        bookId: 'the-metamorphosis',
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
        audioDurationMetadata: true // SOLUTION 1 REQUIRED
      }
    });

    if (!bookChunks || bookChunks.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No bundles found for The Metamorphosis A1'
      }, { status: 404 });
    }

    console.log(`✅ Loaded ${bookChunks.length} bundles from BookChunk table`);

    // Convert BookChunk data to API format with Solution 1 cached timing
    const bundles: BundleMetadata[] = [];

    // Initialize Supabase client once
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL as string,
      process.env.SUPABASE_SERVICE_ROLE_KEY as string
    );

    bookChunks.forEach((chunk: any, index) => {
      // Generate Supabase storage URL from relative path
      const audioUrl = supabase.storage
        .from('audio-files')
        .getPublicUrl(chunk.audioFilePath!)
        .data.publicUrl;

      let sentencesWithTimings;
      let totalDuration: number;

      // SOLUTION 1: Use cached audioDurationMetadata (MANDATORY)
      if (chunk.audioDurationMetadata && chunk.audioDurationMetadata.sentenceTimings) {
        // Use cached Solution 1 data (instant 2-3 second load)
        const metadata = chunk.audioDurationMetadata as any;
        console.log(`Bundle ${index}: Using cached duration ${metadata.measuredDuration?.toFixed(3)}s`);

        totalDuration = metadata.measuredDuration;

        // Use cached sentence timings from Solution 1 (PREFERRED PATH - exact boundaries)
        sentencesWithTimings = metadata.sentenceTimings.map((timing: any) => ({
          sentenceId: `s${timing.sentenceIndex}`,
          sentenceIndex: timing.sentenceIndex, // Use original index (no double-offset)
          text: timing.text,
          startTime: timing.startTime,
          endTime: timing.endTime
        }));
      } else {
        // NO CACHED DATA - This should not happen with Solution 1
        throw new Error('Missing audioDurationMetadata - regenerate bundles with Solution 1');
      }

      const bundle = {
        bundleId: `bundle_${index}`,
        bundleIndex: index,
        audioUrl,
        totalDuration: parseFloat(totalDuration.toFixed(3)),
        sentences: sentencesWithTimings
      };

      bundles.push(bundle);
    });

    // Get book metadata
    const bookContent = await prisma.bookContent.findFirst({
      where: { bookId: 'the-metamorphosis' }
    });

    const totalSentences = bundles.reduce((sum, bundle) => sum + bundle.sentences.length, 0);

    return NextResponse.json({
      success: true,
      book: {
        id: bookId,
        title: bookContent?.title || 'The Metamorphosis',
        author: bookContent?.author || 'Franz Kafka'
      },
      level: 'A1',
      totalBundles: bundles.length,
      totalSentences,
      bundles,
      source: 'metamorphosis-a1-api' // Indicates this came from dedicated API for debugging
    });

  } catch (error) {
    console.error('The Metamorphosis A1 API error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}