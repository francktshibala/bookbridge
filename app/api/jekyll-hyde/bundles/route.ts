import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

interface JekyllBundle {
  bundleId: number;
  originalSentences: string[];
  simplifiedSentences: string[];
}

interface CacheData {
  bookId: string;
  title: string;
  author: string;
  targetLevel: string;
  totalBundles: number;
  bundles: JekyllBundle[];
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

    // This API is specifically for Jekyll & Hyde A1
    if (bookId !== 'gutenberg-43-A1') {
      return NextResponse.json({
        success: false,
        error: 'This API only supports Jekyll & Hyde A1'
      }, { status: 400 });
    }

    console.log(`🧪 Loading Jekyll & Hyde bundles for level: ${level}`);

    // Load simplified bundles from cache
    const cacheFilePath = path.join(process.cwd(), 'cache', 'jekyll-hyde-a1-bundles.json');

    let cacheData: CacheData;
    try {
      const fileContent = await fs.readFile(cacheFilePath, 'utf8');
      cacheData = JSON.parse(fileContent);
      console.log(`✅ Loaded ${cacheData.bundles.length} bundles from cache`);
    } catch (error) {
      console.error('Failed to load cache file:', error);
      return NextResponse.json({
        success: false,
        error: 'Cache file not found for Jekyll & Hyde A1'
      }, { status: 404 });
    }

    // Convert cache data to API format
    const bundles: BundleMetadata[] = cacheData.bundles.map((bundle, index) => {
      const bundleNumber = String(index + 1).padStart(3, '0');
      const audioUrl = `/audio/jekyll-hyde-a1/bundle-${bundleNumber}.mp3`;

      // Calculate estimated timings (2.5 seconds per sentence average)
      const sentencesWithTimings = bundle.simplifiedSentences.map((text, sentenceIdx) => ({
        sentenceId: `s${index * 4 + sentenceIdx}`,
        sentenceIndex: index * 4 + sentenceIdx,
        text: text.trim(),
        startTime: sentenceIdx * 2.5,
        endTime: (sentenceIdx + 1) * 2.5
      }));

      return {
        bundleId: `bundle_${index}`,
        bundleIndex: index,
        audioUrl,
        totalDuration: bundle.simplifiedSentences.length * 2.5,
        sentences: sentencesWithTimings
      };
    });

    const totalSentences = cacheData.bundles.reduce((sum, bundle) => sum + bundle.simplifiedSentences.length, 0);

    return NextResponse.json({
      success: true,
      book: {
        id: bookId,
        title: cacheData.title,
        author: cacheData.author
      },
      level: cacheData.targetLevel,
      totalBundles: bundles.length,
      totalSentences,
      bundles,
      source: 'cache' // Indicates this came from cache for debugging
    });

  } catch (error) {
    console.error('Jekyll & Hyde API error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}