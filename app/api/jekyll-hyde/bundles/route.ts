import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export const runtime = 'nodejs';
export const revalidate = 3600; // Cache for 1 hour

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

    // This API is specifically for Jekyll & Hyde A1 - accept both ID variants
    if (bookId !== 'gutenberg-43-A1' && bookId !== 'gutenberg-43') {
      return NextResponse.json({
        success: false,
        error: 'This API only supports Jekyll & Hyde A1'
      }, {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store'
        }
      });
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
      }, {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store'
        }
      });
    }

    // Convert cache data to API format
    const bundles: BundleMetadata[] = cacheData.bundles.map((bundle, index) => {
      // Use correct Supabase storage path format
      const audioUrl = `https://xsolwqqdbsuydwmmwtsl.supabase.co/storage/v1/object/public/audio-files/jekyll-hyde/bundle_${index}.mp3`;

      // Calculate dynamic timings based on word count (matches working API)
      const sentencesWithTimings = bundle.simplifiedSentences.map((text, sentenceIdx) => {
        const words = text.trim().split(/\s+/).length;
        const secondsPerWord = 0.4; // Same as working API
        const minDuration = 2.0;    // Same as working API
        const duration = Math.max(words * secondsPerWord, minDuration);

        // Calculate cumulative start time
        const startTime = sentenceIdx === 0 ? 0 : bundle.simplifiedSentences.slice(0, sentenceIdx).reduce((sum, prevText) => {
          const prevWords = prevText.trim().split(/\s+/).length;
          return sum + Math.max(prevWords * secondsPerWord, minDuration);
        }, 0);

        return {
          sentenceId: `s${index * 4 + sentenceIdx}`,
          sentenceIndex: index * 4 + sentenceIdx,
          text: text.trim(),
          startTime: startTime,
          endTime: startTime + duration
        };
      });

      return {
        bundleId: `bundle_${index}`,
        bundleIndex: index,
        audioUrl,
        totalDuration: sentencesWithTimings.reduce((total, sentence) => Math.max(total, sentence.endTime), 0),
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
      bundleCount: bundles.length,
      totalSentences,
      bundles,
      source: 'cache' // Indicates this came from cache for debugging
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400'
      }
    });

  } catch (error) {
    console.error('Jekyll & Hyde API error:', error);
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