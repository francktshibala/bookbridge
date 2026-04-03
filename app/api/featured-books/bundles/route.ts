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
    const limitParam = parseInt(searchParams.get('limit') || '10', 10);
    const offsetParam = parseInt(searchParams.get('offset') || '0', 10);
    const pageLimit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 100) : 10;
    const pageOffset = Number.isFinite(offsetParam) && offsetParam >= 0 ? offsetParam : 0;

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

    // First, get total count of bundles (chunk_index = 0 marks first sentence of each bundle)
    const { count: totalBundlesCount, error: countError } = await supabase
      .from('audio_assets')
      .select('*', { count: 'exact', head: true })
      .eq('book_id', bookId)
      .eq('cefr_level', level)
      .eq('chunk_index', 0);

    if (countError) {
      console.error('Supabase count error:', countError);
      return NextResponse.json({ success: false, error: 'Failed to count audio data' }, { status: 500 });
    }

    // Then, fetch only the current page of bundles
    const rangeFrom = pageOffset;
    const rangeTo = pageOffset + pageLimit - 1;
    const { data: pageAssets, error: pageError } = await supabase
      .from('audio_assets')
      .select('*')
      .eq('book_id', bookId)
      .eq('cefr_level', level)
      .eq('chunk_index', 0)
      .order('sentence_index', { ascending: true })
      .range(rangeFrom, rangeTo);

    if (pageError) {
      console.error('Supabase page error:', pageError);
      return NextResponse.json({ success: false, error: 'Failed to load audio data' }, { status: 500 });
    }

    console.log(`✅ Page loaded: ${pageAssets?.length || 0} assets (offset=${pageOffset}, limit=${pageLimit}, total=${totalBundlesCount || 0})`);

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

    const buildSentencesWithTimings = (bundleSentences: string[], bundleIndex: number) => {
      const secondsPerWord = 0.4;
      const minDuration = 2.0;
      return bundleSentences.map((text, sentenceIdx) => {
        const words = text.trim().split(/\s+/).length;
        const duration = Math.max(words * secondsPerWord, minDuration);
        const startTime = sentenceIdx === 0 ? 0 : bundleSentences.slice(0, sentenceIdx).reduce((sum, prevText) => {
          const prevWords = prevText.trim().split(/\s+/).length;
          return sum + Math.max(prevWords * secondsPerWord, minDuration);
        }, 0);
        return {
          sentenceId: `s${bundleIndex * SENTENCES_PER_BUNDLE + sentenceIdx}`,
          sentenceIndex: bundleIndex * SENTENCES_PER_BUNDLE + sentenceIdx,
          text: text.trim(),
          startTime,
          endTime: startTime + duration
        };
      });
    };

    let bundles: BundleMetadata[];

    if (!pageAssets || pageAssets.length === 0) {
      // Text-only mode: no audio assets, build bundles from text alone
      const totalBundles = Math.ceil(sentences.length / SENTENCES_PER_BUNDLE);
      const startBundle = Math.floor(pageOffset);
      const endBundle = Math.min(startBundle + pageLimit, totalBundles);

      bundles = Array.from({ length: endBundle - startBundle }, (_, i) => {
        const bundleIdx = startBundle + i;
        const bundleSentences = sentences.slice(
          bundleIdx * SENTENCES_PER_BUNDLE,
          (bundleIdx + 1) * SENTENCES_PER_BUNDLE
        );
        const sentencesWithTimings = buildSentencesWithTimings(bundleSentences, bundleIdx);
        return {
          bundleId: `bundle_${bundleIdx}`,
          bundleIndex: bundleIdx,
          audioUrl: '',
          totalDuration: 0,
          sentences: sentencesWithTimings
        };
      });

      return new NextResponse(
        JSON.stringify({
          success: true,
          book: { id: bookId, title: bookContent.title, author: bookContent.author },
          level,
          textOnly: true,
          totalBundles: totalBundles,
          bundleCount: totalBundles,
          totalSentences: sentences.length,
          bundles,
          page: { offset: pageOffset, limit: pageLimit, returned: bundles.length }
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400'
          }
        }
      );
    }

    // Create proper bundles with Jekyll's dynamic timing method (CRITICAL FIX)
    bundles = pageAssets.map(asset => {
      const bundleSentences = sentences.slice(
        asset.sentence_index * SENTENCES_PER_BUNDLE,
        (asset.sentence_index + 1) * SENTENCES_PER_BUNDLE
      );
      const sentencesWithTimings = buildSentencesWithTimings(bundleSentences, asset.sentence_index);
      return {
        bundleId: `bundle_${asset.sentence_index}`,
        bundleIndex: asset.sentence_index,
        audioUrl: asset.audio_url,
        totalDuration: sentencesWithTimings.reduce((total, sentence) => Math.max(total, sentence.endTime), 0),
        sentences: sentencesWithTimings
      };
    });

    return new NextResponse(
      JSON.stringify({
        success: true,
        book: {
          id: bookId,
          title: bookContent.title,
          author: bookContent.author
        },
        level,
        totalBundles: totalBundlesCount || bundles.length,
        bundleCount: totalBundlesCount || bundles.length, // Back-compat for clients expecting bundleCount
        totalSentences: sentences.length,
        bundles,
        page: { offset: pageOffset, limit: pageLimit, returned: bundles.length }
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          // Cache for 1 hour on CDN; allow serving stale while revalidating
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400'
        }
      }
    );

  } catch (error) {
    console.error('Bundle API error:', error);
    return new NextResponse(
      JSON.stringify({
        success: false,
        error: 'Internal server error'
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store'
        }
      }
    );
  } finally {
    await prisma.$disconnect();
  }
}