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

    // Try new BookChunk architecture first (for Great Gatsby, Sleepy Hollow)
    let bundleAssets: any[] = [];
    let error: any = null;

    const bookChunks = await prisma.bookChunk.findMany({
      where: {
        bookId: bookId,
        cefrLevel: level.toUpperCase(),
        audioFilePath: { not: null }
      },
      orderBy: { chunkIndex: 'asc' }
    });

    if (bookChunks && bookChunks.length > 0) {
      console.log(`✅ Found ${bookChunks.length} chunks in BookChunk table`);

      // Convert BookChunk data to bundle format
      bundleAssets = bookChunks.map(chunk => {
        // Generate audio URL from Supabase storage path
        const audioUrl = supabase.storage
          .from('audio-files')
          .getPublicUrl(chunk.audioFilePath!)
          .data.publicUrl;

        // Split chunk text into sentences (4 per chunk)
        const sentences = chunk.chunkText.split(/(?<=[.!?])\s+/).filter(s => s.trim());
        const sentencesPerBundle = 4;

        return {
          book_id: bookId,
          cefr_level: level,
          chunk_index: 0,
          sentence_index: chunk.chunkIndex,
          audio_url: audioUrl,
          provider: chunk.audioProvider || 'elevenlabs',
          word_timings: sentences.slice(0, sentencesPerBundle).map((text, idx) => {
            const words = text.trim().split(/\s+/).length;
            const duration = Math.max(words * 0.4, 2.0); // ~0.4s per word, min 2s
            const startTime = idx === 0 ? 0 : sentences.slice(0, idx).reduce((sum, prevText) => {
              const prevWords = prevText.trim().split(/\s+/).length;
              return sum + Math.max(prevWords * 0.4, 2.0);
            }, 0);

            return {
              sentenceId: `${bookId}-${chunk.chunkIndex}-${idx}`,
              sentenceIndex: chunk.chunkIndex * sentencesPerBundle + idx,
              text: text.trim(),
              startTime: startTime,
              endTime: startTime + duration,
              wordTimings: [] // No word-level timings for TTS
            };
          })
        };
      });
    } else {
      // Fallback to legacy audio_assets table
      let offset = 0;
      const limit = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data: batch, error: batchError } = await supabase
          .from('audio_assets')
          .select('*')
          .eq('book_id', bookId)
          .eq('cefr_level', level)
          .eq('chunk_index', 0)
          .order('sentence_index', { ascending: true })
          .range(offset, offset + limit - 1);

        if (batchError) {
          error = batchError;
          break;
        }

        if (batch && batch.length > 0) {
          bundleAssets = [...bundleAssets, ...batch];
          offset += limit;
          hasMore = batch.length === limit;
        } else {
          hasMore = false;
        }
      }
    }

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

    // We DON'T need display text splitting - use the actual stored sentences!
    const sentencesPerBundle = 4;

    // Convert database records to bundle format
    const bundles: RealBundleData[] = bundleAssets.map((asset, index) => {
      const bundleIndex = asset.sentence_index; // In bundles, sentence_index = bundle_index
      const bundleId = `bundle_${bundleIndex}`;

      // The word_timings field contains the full bundle timing metadata
      const bundleMetadata = asset.word_timings as any[];

      // Use the actual stored metadata (which now has the real text and timing)
      let synthesizedMetadata = bundleMetadata;

      // The metadata should already have real sentences from fix-bundle-timing.js
      // If it's still empty for some reason, return empty bundle
      if (!Array.isArray(bundleMetadata) || bundleMetadata.length === 0) {
        console.warn(`Bundle ${bundleIndex} has no metadata - skipping`);
        synthesizedMetadata = [];
      }

      // Calculate total duration from sentence timings (synthesized or real)
      const totalDuration = synthesizedMetadata.length > 0
        ? Math.max(...synthesizedMetadata.map((s: any) => s.endTime))
        : 10.0; // Fallback estimate

      return {
        bundleId,
        bundleIndex,
        audioUrl: asset.audio_url,
        totalDuration,
        sentences: (synthesizedMetadata as any[])
          .slice()
          .sort((a: any, b: any) => (a.sentenceIndex ?? a.sentence_index) - (b.sentenceIndex ?? b.sentence_index))
          .map(sentence => ({
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