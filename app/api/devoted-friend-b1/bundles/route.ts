import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const bookId = searchParams.get('bookId');

    // This API supports The Devoted Friend for B1 level
    if (bookId !== 'the-devoted-friend' && bookId !== 'devoted-friend-b1') {
      return NextResponse.json({
        success: false,
        error: 'This API only supports The Devoted Friend B1'
      }, { status: 400 });
    }

    // Load B1 bundles from cache
    const bundlePath = path.join(process.cwd(), 'cache', 'the-devoted-friend-B1-bundles.json');

    if (!fs.existsSync(bundlePath)) {
      return NextResponse.json({
        success: false,
        error: 'B1 bundles not found. Please generate them first.'
      }, { status: 404 });
    }

    const bundleData = JSON.parse(fs.readFileSync(bundlePath, 'utf8'));

    // Handle old array format vs new object format
    if (Array.isArray(bundleData)) {
      // Old format - convert to new format and add missing timing data
      const totalSentences = bundleData.reduce((sum, bundle) => sum + (bundle.sentences?.length || 0), 0);

      // Convert bundles to match expected format with timing data
      const convertedBundles = bundleData.map((bundle, bundleIndex) => {
        // Check if bundle has sentenceTimings (A2 format) or needs conversion (B1 format)
        if (bundle.sentenceTimings) {
          // A2 format - use existing timing data
          return {
            ...bundle,
            bundleIndex,
            bundleId: `bundle_${bundleIndex}`,
            totalDuration: bundle.duration || bundle.totalDuration,
            sentences: bundle.sentenceTimings.map((timing: any) => ({
              sentenceId: `s${timing.sentenceIndex}`,
              sentenceIndex: timing.sentenceIndex,
              text: timing.text,
              startTime: timing.startTime,
              endTime: timing.endTime
            }))
          };
        } else {
          // B1 format - add synthetic timing data
          const sentences = bundle.sentences || [];
          let currentTime = 0;
          const sentencesWithTiming = sentences.map((sentence: any, index: number) => {
            const words = sentence.text.split(' ').length;
            const duration = words * 0.5; // 0.5 seconds per word estimate
            const startTime = currentTime;
            const endTime = currentTime + duration;
            currentTime = endTime;

            return {
              sentenceId: `s${sentence.sentenceIndex}`,
              sentenceIndex: sentence.sentenceIndex,
              text: sentence.text,
              startTime,
              endTime
            };
          });

          return {
            bundleIndex,
            bundleId: `bundle_${bundleIndex}`,
            audioUrl: bundle.audioUrl,
            totalDuration: currentTime,
            sentences: sentencesWithTiming
          };
        }
      });

      return NextResponse.json({
        success: true,
        book: {
          id: 'the-devoted-friend',
          title: 'The Devoted Friend',
          author: 'Oscar Wilde'
        },
        level: 'B1',
        totalBundles: bundleData.length,
        totalSentences,
        bundles: convertedBundles
      });
    } else {
      // New format
      return NextResponse.json({
        success: true,
        book: {
          id: bundleData.bookId,
          title: bundleData.title,
          author: bundleData.author
        },
        level: bundleData.cefrLevel,
        totalBundles: bundleData.totalBundles,
        totalSentences: bundleData.totalSentences,
        bundles: bundleData.bundles
      });
    }

  } catch (error) {
    console.error('Error loading Devoted Friend B1 bundles:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to load B1 bundles'
    }, { status: 500 });
  }
}