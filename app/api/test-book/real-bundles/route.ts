import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface RealBundleData {
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
    wordTimings: Array<{
      word: string;
      start: number;
      end: number;
    }>;
  }>;
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
      }, { status: 400 });
    }

    console.log(`📦 Loading real bundles for book: ${bookId}, level: ${level}`);

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

    // Get audio assets - fallback to individual sentences if bundles not available
    let { data: bundleAssets, error } = await supabase
      .from('audio_assets')
      .select('*')
      .eq('book_id', bookId)
      .eq('cefr_level', level)
      .eq('chunk_index', 0)
      .eq('provider', 'openai-bundled') // Try bundled first
      .order('sentence_index', { ascending: true });

    // Fallback to individual sentences if no bundles found
    if (!bundleAssets || bundleAssets.length === 0) {
      console.log('No bundled audio found, falling back to individual sentences');

      // Try the original test book with individual sentences
      const fallbackBookId = 'test-continuous-001';
      const { data: individualAssets, error: fallbackError } = await supabase
        .from('audio_assets')
        .select('*')
        .eq('book_id', fallbackBookId)
        .eq('cefr_level', level)
        .eq('chunk_index', 0)
        .order('sentence_index', { ascending: true });

      if (individualAssets && individualAssets.length > 0) {
        // Group individual sentences into logical bundles
        bundleAssets = [];
        const sentencesPerBundle = 4;

        for (let i = 0; i < individualAssets.length; i += sentencesPerBundle) {
          const bundleSentences = individualAssets.slice(i, i + sentencesPerBundle);
          const bundleIndex = Math.floor(i / sentencesPerBundle);

          // Create a logical bundle from individual sentences
          const bundleData = {
            book_id: fallbackBookId,
            cefr_level: level,
            chunk_index: 0,
            sentence_index: bundleIndex,
            audio_url: bundleSentences[0].audio_url, // Use first sentence's audio as placeholder
            provider: 'openai-simulated-bundle',
            word_timings: bundleSentences.map((asset, idx) => ({
              sentenceId: `s${asset.sentence_index}`,
              sentenceIndex: asset.sentence_index,
              text: `Sentence ${asset.sentence_index + 1}`, // Placeholder text
              startTime: idx * 2.5, // Estimate 2.5s per sentence
              endTime: (idx + 1) * 2.5,
              wordTimings: [],
              individualAudioUrl: asset.audio_url // Store individual URLs for playback
            }))
          };

          bundleAssets.push(bundleData);
        }

        console.log(`✅ Created ${bundleAssets.length} simulated bundles from ${individualAssets.length} sentences`);
      } else {
        error = fallbackError;
      }
    }

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({
        success: false,
        error: 'Failed to load bundle data'
      }, { status: 500 });
    }

    if (!bundleAssets || bundleAssets.length === 0) {
      return NextResponse.json({
        success: false,
        error: `No bundled audio found for ${bookId} at ${level} level. Has the bundled test book been generated?`
      }, { status: 404 });
    }

    // Convert database records to bundle format
    const bundles: RealBundleData[] = bundleAssets.map((asset, index) => {
      const bundleIndex = asset.sentence_index; // In bundles, sentence_index = bundle_index
      const bundleId = `bundle_${bundleIndex}`;

      // The word_timings field contains the full bundle timing metadata
      const bundleMetadata = asset.word_timings as any[];

      // Calculate total duration from sentence timings
      const totalDuration = bundleMetadata.length > 0
        ? Math.max(...bundleMetadata.map(s => s.endTime))
        : 10.0; // Fallback estimate

      return {
        bundleId,
        bundleIndex,
        audioUrl: asset.audio_url,
        totalDuration,
        sentences: bundleMetadata.map(sentence => ({
          sentenceId: sentence.sentenceId,
          sentenceIndex: sentence.sentenceIndex,
          text: sentence.text,
          startTime: sentence.startTime,
          endTime: sentence.endTime,
          wordTimings: sentence.wordTimings || [],
          // Preserve individualAudioUrl if it exists (for simulated bundles)
          ...(sentence.individualAudioUrl && { individualAudioUrl: sentence.individualAudioUrl })
        }))
      };
    });

    // Calculate total sentences across all bundles
    const totalSentences = bundles.reduce((total, bundle) => total + bundle.sentences.length, 0);

    console.log(`✅ Loaded ${bundles.length} real bundles with ${totalSentences} sentences`);

    return NextResponse.json({
      success: true,
      bookId,
      title: bookContent.title,
      author: bookContent.author,
      level,
      bundleCount: bundles.length,
      totalSentences,
      sentencesPerBundle: bundles.length > 0 ? Math.round(totalSentences / bundles.length) : 4,
      bundles,
      audioType: 'real-bundles' // Distinguish from mock bundles
    });

  } catch (error) {
    console.error('Real bundle API error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}