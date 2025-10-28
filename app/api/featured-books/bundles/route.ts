export const runtime = 'nodejs';
export const revalidate = 3600; // Cache API responses for 1 hour (server-side)

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { prisma } from '@/lib/prisma';

// Using singleton prisma from @/lib/prisma;
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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

const SENTENCES_PER_BUNDLE = 4;

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const bookId = searchParams.get('bookId');
    const level = searchParams.get('level') || 'original';

    if (!bookId) {
      return NextResponse.json({
        success: false,
        error: 'Book ID is required'
      }, { status: 400 });
    }

    console.log(`📦 Loading bundles for book: ${bookId}, level: ${level}`);

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
      }, { status: 404 });
    }

    // Get ALL audio bundles - handle the 1000 row limit
    let allAudioAssets: any[] = [];
    let offset = 0;
    const limit = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data: batch, error } = await supabase
        .from('audio_assets')
        .select('*')
        .eq('book_id', bookId)
        .eq('cefr_level', level)
        .eq('chunk_index', 0)
        .order('sentence_index', { ascending: true })
        .range(offset, offset + limit - 1);

      if (error) {
        console.error('Supabase error:', error);
        return NextResponse.json({
          success: false,
          error: 'Failed to load audio data'
        }, { status: 500 });
      }

      if (batch && batch.length > 0) {
        allAudioAssets = [...allAudioAssets, ...batch];
        offset += limit;
        hasMore = batch.length === limit;
      } else {
        hasMore = false;
      }
    }

    console.log(`✅ Loaded ${allAudioAssets.length} audio assets`);

    if (allAudioAssets.length === 0) {
      return NextResponse.json({
        success: false,
        error: `No audio found for ${bookId} at ${level} level`
      }, { status: 404 });
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

    // Create proper bundles with Jekyll's dynamic timing method (CRITICAL FIX)
    const bundles: BundleMetadata[] = allAudioAssets.map(asset => {
      const bundleSentences = sentences.slice(
        asset.sentence_index * SENTENCES_PER_BUNDLE,
        (asset.sentence_index + 1) * SENTENCES_PER_BUNDLE
      );

      // Calculate dynamic timings based on word count (Jekyll's method)
      const sentencesWithTimings = bundleSentences.map((text, sentenceIdx) => {
        const words = text.trim().split(/\s+/).length;
        const secondsPerWord = 0.4; // Same as Jekyll
        const minDuration = 2.0;    // Same as Jekyll
        const duration = Math.max(words * secondsPerWord, minDuration);

        // Calculate cumulative start time (Jekyll's method)
        const startTime = sentenceIdx === 0 ? 0 : bundleSentences.slice(0, sentenceIdx).reduce((sum, prevText) => {
          const prevWords = prevText.trim().split(/\s+/).length;
          return sum + Math.max(prevWords * secondsPerWord, minDuration);
        }, 0);

        return {
          sentenceId: `s${asset.sentence_index * SENTENCES_PER_BUNDLE + sentenceIdx}`,
          sentenceIndex: asset.sentence_index * SENTENCES_PER_BUNDLE + sentenceIdx,
          text: text.trim(),
          startTime: startTime,
          endTime: startTime + duration
        };
      });

      return {
        bundleId: `bundle_${asset.sentence_index}`,
        bundleIndex: asset.sentence_index,
        audioUrl: asset.audio_url,
        totalDuration: sentencesWithTimings.reduce((total, sentence) => Math.max(total, sentence.endTime), 0),
        sentences: sentencesWithTimings
      };
    });

    return NextResponse.json({
      success: true,
      book: {
        id: bookId,
        title: bookContent.title,
        author: bookContent.author
      },
      level,
      totalBundles: bundles.length,
      totalSentences: sentences.length,
      bundles
    });

  } catch (error) {
    console.error('Bundle API error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}