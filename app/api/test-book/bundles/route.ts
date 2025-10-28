import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const revalidate = 3600; // Cache for 1 hour
export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Bundle configuration
const SENTENCES_PER_BUNDLE = 4; // 4 sentences per bundle for testing

interface BundleMetadata {
  bundleId: string;
  bundleIndex: number;
  audioUrl: string; // For now, use first sentence's audio as mock
  totalDuration: number; // Estimated
  sentences: Array<{
    sentenceId: string;
    sentenceIndex: number;
    text: string;
    startTime: number; // Relative to bundle start
    endTime: number;   // Relative to bundle start
    wordTimings: Array<{
      word: string;
      start: number; // Relative to bundle start
      end: number;   // Relative to bundle start
    }>;
  }>;
}

function approximateWordTimings(text: string, startTime: number, endTime: number) {
  const words = text.split(' ').filter(w => w.length > 0);
  const duration = endTime - startTime;
  const timePerWord = duration / words.length;

  return words.map((word, index) => ({
    word: word.replace(/[.!?,:;]/g, ''), // Clean punctuation for timing
    start: startTime + (index * timePerWord),
    end: startTime + ((index + 1) * timePerWord)
  }));
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const bookId = searchParams.get('bookId');
    const level = searchParams.get('level') || 'original';

    if (!bookId) {
      return NextResponse.json({
        success: false,
        error: 'Book ID is required'
      }, {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store'
        }
      });
    }

    console.log(`📦 Loading sentence bundles for book: ${bookId}, level: ${level}`);

    // Get book metadata
    const bookContent = await prisma.bookContent.findUnique({
      where: { bookId },
      select: {
        title: true,
        author: true,
        fullText: true
      }
    });

    if (!bookContent) {
      return NextResponse.json({
        success: false,
        error: `Book not found: ${bookId}`
      }, {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store'
        }
      });
    }

    // Get sentence-level audio from Supabase
    const { data: audioAssets, error } = await supabase
      .from('audio_assets')
      .select('*')
      .eq('book_id', bookId)
      .eq('cefr_level', level)
      .eq('chunk_index', 0)
      .order('sentence_index', { ascending: true });

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({
        success: false,
        error: 'Failed to load audio data'
      }, {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store'
        }
      });
    }

    if (!audioAssets || audioAssets.length === 0) {
      return NextResponse.json({
        success: false,
        error: `No audio found for ${bookId} at ${level} level. Has the test book been generated?`
      }, {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store'
        }
      });
    }

    // Get display text
    let displayText = bookContent.fullText;
    if (level !== 'original') {
      const simplification = await prisma.bookSimplification.findFirst({
        where: {
          bookId,
          targetLevel: level,
          chunkIndex: 0
        },
        select: {
          simplifiedText: true
        }
      });

      if (simplification) {
        displayText = simplification.simplifiedText;
      }
    }

    // Split text into sentences
    const sentences = displayText
      .split(/[.!?]+/)
      .map(s => s.trim())
      .filter(s => s.length > 0)
      .map(s => s + (s.endsWith('.') || s.endsWith('!') || s.endsWith('?') ? '' : '.'));

    // Create bundles from individual sentences
    const bundles: BundleMetadata[] = [];

    for (let i = 0; i < audioAssets.length; i += SENTENCES_PER_BUNDLE) {
      const bundleSentences = audioAssets.slice(i, i + SENTENCES_PER_BUNDLE);
      const bundleIndex = Math.floor(i / SENTENCES_PER_BUNDLE);

      // Estimate timing for each sentence in bundle (2.5 seconds average per sentence)
      let bundleTime = 0;
      const bundleData: BundleMetadata = {
        bundleId: `bundle_${bundleIndex}`,
        bundleIndex,
        audioUrl: bundleSentences[0].audio_url, // Mock: use first sentence's audio
        totalDuration: bundleSentences.length * 2.5, // Estimate
        sentences: bundleSentences.map((asset, sentenceIndexInBundle) => {
          const sentenceText = sentences[asset.sentence_index] || `Sentence ${asset.sentence_index + 1}`;
          const sentenceDuration = 2.5; // Estimate 2.5 seconds per sentence
          const startTime = bundleTime;
          const endTime = bundleTime + sentenceDuration;
          bundleTime = endTime;

          return {
            sentenceId: `s${asset.sentence_index}`,
            sentenceIndex: asset.sentence_index,
            text: sentenceText,
            startTime,
            endTime,
            wordTimings: approximateWordTimings(sentenceText, startTime, endTime)
          };
        })
      };

      bundles.push(bundleData);
    }

    console.log(`✅ Created ${bundles.length} bundles from ${audioAssets.length} sentences`);

    return NextResponse.json({
      success: true,
      bookId,
      title: bookContent.title,
      author: bookContent.author,
      level,
      bundleCount: bundles.length,
      totalBundles: bundles.length,
      totalSentences: audioAssets.length,
      sentencesPerBundle: SENTENCES_PER_BUNDLE,
      bundles
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400'
      }
    });

  } catch (error) {
    console.error('Bundle API error:', error);
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