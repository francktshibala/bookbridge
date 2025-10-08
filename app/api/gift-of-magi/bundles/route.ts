import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

interface GiftBundle {
  bundleIndex: number;
  bundleId: string;
  sentences: Array<{
    sentenceIndex: number;
    text: string;
    startTime: number;
    endTime: number;
  }>;
  audioUrl?: string;
  totalDuration: number;
}

interface CacheData {
  bookId: string;
  title: string;
  author: string;
  cefrLevel: string;
  totalBundles: number;
  totalSentences: number;
  bundles: GiftBundle[];
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

    // This API supports Gift of the Magi
    if (bookId !== 'gift-of-the-magi') {
      return NextResponse.json({
        success: false,
        error: 'This API only supports Gift of the Magi'
      }, { status: 400 });
    }

    console.log(`🎁 Loading Gift of the Magi bundles for level: ${level}`);

    // Load bundles from cache
    const cacheFilePath = path.join(process.cwd(), 'cache', 'gift-of-the-magi-A1-bundles.json');

    let cacheData: CacheData;
    try {
      const fileContent = await fs.readFile(cacheFilePath, 'utf8');
      cacheData = JSON.parse(fileContent);
      console.log(`✅ Loaded ${cacheData.bundles.length} bundles from cache`);
    } catch (error) {
      console.error('Failed to load cache file:', error);
      return NextResponse.json({
        success: false,
        error: 'Cache file not found for Gift of the Magi'
      }, { status: 404 });
    }

    // Convert cache data to API format
    const bundles: BundleMetadata[] = cacheData.bundles.map((bundle, index) => {
      return {
        bundleId: bundle.bundleId,
        bundleIndex: bundle.bundleIndex,
        audioUrl: bundle.audioUrl || `https://xsolwqqdbsuydwmmwtsl.supabase.co/storage/v1/object/public/audio-files/gift-of-the-magi/A1/sarah/bundle_${index}.mp3`,
        totalDuration: bundle.totalDuration,
        sentences: bundle.sentences.map(sentence => ({
          sentenceId: `s${sentence.sentenceIndex}`,
          sentenceIndex: sentence.sentenceIndex,
          text: sentence.text,
          startTime: sentence.startTime,
          endTime: sentence.endTime
        }))
      };
    });

    const totalSentences = cacheData.totalSentences;

    return NextResponse.json({
      success: true,
      book: {
        id: bookId,
        title: cacheData.title,
        author: cacheData.author
      },
      level: cacheData.cefrLevel,
      totalBundles: bundles.length,
      totalSentences,
      bundles,
      source: 'cache', // Indicates this came from cache for debugging
      chapters: [
        { id: 1, title: "Pennies and Parsimony", startSentence: 0, endSentence: 5 },
        { id: 2, title: "Della's Christmas Eve Predicament", startSentence: 6, endSentence: 24 },
        { id: 3, title: "Saving for Jim's Present", startSentence: 25, endSentence: 66 },
        { id: 4, title: "The Unrivaled Platinum Chain", startSentence: 67, endSentence: 88 },
        { id: 5, title: "Jim's Quiet Entrance", startSentence: 89, endSentence: 119 },
        { id: 6, title: "Awakening to Love's Worth", startSentence: 120, endSentence: 276 }
      ]
    });

  } catch (error) {
    console.error('Gift of the Magi API error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}