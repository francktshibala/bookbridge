import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

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

    // This API supports The Gift of the Magi for A1 level
    if (bookId !== 'gift-of-the-magi' && bookId !== 'gift-of-the-magi-a1') {
      return NextResponse.json({
        success: false,
        error: 'This API only supports The Gift of the Magi A1'
      }, { status: 400 });
    }

    console.log(`🎁 Loading The Gift of the Magi bundles for level: ${level}`);

    // Load bundles from cache file (complete 13 bundles with Sarah voice)
    let bundlesData;
    try {
      const bundlesPath = path.join(process.cwd(), 'cache', 'gift-of-the-magi-A1-bundles.json');
      const bundlesFile = fs.readFileSync(bundlesPath, 'utf-8');
      bundlesData = JSON.parse(bundlesFile);
    } catch (error) {
      return NextResponse.json({
        success: false,
        error: 'Could not load Gift of the Magi bundles'
      }, { status: 404 });
    }

    console.log(`✅ Loaded ${bundlesData.totalBundles} bundles from cache file`);

    // Convert bundle data to API format
    const bundles: BundleMetadata[] = bundlesData.bundles.map((bundle: any) => ({
      bundleId: bundle.bundleId,
      bundleIndex: bundle.bundleIndex,
      audioUrl: bundle.audioUrl,
      totalDuration: bundle.totalDuration,
      sentences: bundle.sentences.map((sentence: any) => ({
        sentenceId: `s${sentence.sentenceIndex}`,
        sentenceIndex: sentence.sentenceIndex,
        text: sentence.text,
        startTime: sentence.startTime,
        endTime: sentence.endTime
      }))
    }));

    // Load chapter data for thematic headers
    let chapters = null;
    try {
      const chaptersPath = path.join(process.cwd(), 'cache', 'gift-of-the-magi-chapters.json');
      const chaptersData = fs.readFileSync(chaptersPath, 'utf-8');
      chapters = JSON.parse(chaptersData).chapters;
    } catch (error) {
      console.log('Could not load chapters data:', error instanceof Error ? error.message : 'Unknown error');
    }

    const totalSentences = bundles.reduce((sum, bundle) => sum + bundle.sentences.length, 0);

    return NextResponse.json({
      success: true,
      book: {
        id: 'gift-of-the-magi',
        title: 'The Gift of the Magi',
        author: 'O. Henry'
      },
      level: 'A1',
      totalBundles: bundles.length,
      totalSentences,
      bundles,
      chapters, // Add chapter structure for UI
      source: 'updated-complete-version' // Indicates this is the complete 13-bundle version
    });

  } catch (error) {
    console.error('The Gift of the Magi A1 API error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}