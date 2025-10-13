import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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
      }, { status: 400 });
    }

    console.log(`💎 Loading The Necklace B1 bundles with Solution 1...`);

    // Load bundles from database with Solution 1 architecture
    const bundles = await prisma.bookChunk.findMany({
      where: {
        bookId: 'the-necklace',
        cefrLevel: 'B1'
      },
      orderBy: {
        chunkIndex: 'asc'
      }
    });

    if (bundles.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No B1 bundles found in database'
      }, { status: 404 });
    }

    console.log(`✅ Loaded ${bundles.length} B1 bundles from database with Solution 1`);

    // Get the CDN base URL
    const cdnBaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/audio-files/`
      : 'https://xsolwqqdbsuydwmmwtsl.supabase.co/storage/v1/object/public/audio-files/';

    // Convert database bundles to API format using Solution 1 metadata
    const formattedBundles = bundles.map((bundle) => {
      const metadata = bundle.audioDurationMetadata as any;

      if (!metadata || !metadata.sentenceTimings) {
        console.error(`Bundle ${bundle.chunkIndex} missing Solution 1 metadata!`);
        return null;
      }

      return {
        bundleId: `the-necklace-b1-${bundle.chunkIndex}`,
        bundleIndex: bundle.chunkIndex,
        audioUrl: cdnBaseUrl + bundle.audioFilePath,
        totalDuration: metadata.measuredDuration || 0,
        sentences: metadata.sentenceTimings.map((timing: any) => ({
          sentenceId: `s${timing.sentenceIndex}`,
          sentenceIndex: timing.sentenceIndex,
          text: timing.text,
          startTime: timing.startTime,
          endTime: timing.endTime
        }))
      };
    }).filter(Boolean);

    const totalSentences = formattedBundles.reduce(
      (sum, bundle) => sum + (bundle?.sentences?.length || 0),
      0
    );

    // Load chapter data for thematic headers (optional)
    let chapters = null;
    try {
      const path = await import('path');
      const fs = await import('fs');
      const chaptersPath = path.join(process.cwd(), 'cache', 'the-necklace-chapters.json');
      if (fs.existsSync(chaptersPath)) {
        const chaptersData = fs.readFileSync(chaptersPath, 'utf-8');
        chapters = JSON.parse(chaptersData).chapters;
      }
    } catch (error) {
      console.log('Chapters not available');
    }

    return NextResponse.json({
      success: true,
      bookId: 'the-necklace',
      title: 'The Necklace',
      author: 'Guy de Maupassant',
      level: 'B1',
      bundleCount: formattedBundles.length,
      totalSentences,
      bundles: formattedBundles,
      chapters,
      audioType: 'solution1', // Indicates this uses Solution 1 architecture
      metadata: {
        voice: 'Sarah',
        voiceId: 'EXAVITQu4vr4xnSDxMaL',
        speed: 0.90,
        implementation: 'Solution 1 with ffprobe measurement'
      }
    });

  } catch (error) {
    console.error('The Necklace B1 API error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

export async function HEAD() {
  return new Response(null, { status: 200 });
}