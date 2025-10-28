export const runtime = 'nodejs';
export const revalidate = 3600; // Cache for 1 hour

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
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

    // This API supports The Devoted Friend for A1 level
    if (bookId !== 'the-devoted-friend' && bookId !== 'devoted-friend-a1') {
      return NextResponse.json({
        success: false,
        error: 'This API only supports The Devoted Friend A1'
      }, {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store'
        }
      });
    }

    console.log(`🤝 Loading The Devoted Friend bundles for level: ${level}`);

    // Load bundles from cache file (proven pattern)
    let bundlesData;
    try {
      const bundlesPath = path.join(process.cwd(), 'cache', 'the-devoted-friend-A1-bundles.json');
      const bundlesFile = fs.readFileSync(bundlesPath, 'utf-8');
      bundlesData = JSON.parse(bundlesFile);
    } catch (error) {
      return NextResponse.json({
        success: false,
        error: 'Could not load The Devoted Friend bundles'
      }, {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store'
        }
      });
    }

    console.log(`✅ Loaded ${bundlesData.length} bundles from cache file`);

    // Convert bundle data to API format
    const bundles: BundleMetadata[] = bundlesData.map((bundle: any, index: number) => ({
      bundleId: `devoted-friend-a1-bundle-${index}`,
      bundleIndex: bundle.index,
      audioUrl: bundle.audioUrl,
      totalDuration: bundle.duration,
      sentences: bundle.sentenceTimings.map((sentence: any) => ({
        sentenceId: `s${sentence.sentenceIndex}`,
        sentenceIndex: sentence.sentenceIndex,
        text: sentence.text,
        startTime: sentence.startTime,
        endTime: sentence.endTime
      }))
    }));

    // Create thematic chapters for The Devoted Friend (fairy tale structure)
    const chapters = [
      {
        chapterNumber: 1,
        title: "The Water-rat's Question",
        startSentence: 0,
        endSentence: 19,
        startBundle: 0,
        endBundle: 4
      },
      {
        chapterNumber: 2,
        title: "Hans and the Miller",
        startSentence: 20,
        endSentence: 39,
        startBundle: 5,
        endBundle: 9
      }
    ];

    const totalSentences = bundles.reduce((sum, bundle) => sum + bundle.sentences.length, 0);

    return NextResponse.json({
      success: true,
      book: {
        id: 'the-devoted-friend',
        title: 'The Devoted Friend',
        author: 'Oscar Wilde'
      },
      level: 'A1',
      totalBundles: bundles.length,
      bundleCount: bundles.length,
      totalSentences,
      bundles,
      chapters, // Add chapter structure for UI
      source: 'cache-file' // Indicates this came from cache file for debugging
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400'
      }
    });

  } catch (error) {
    console.error('The Devoted Friend A1 API error:', error);
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