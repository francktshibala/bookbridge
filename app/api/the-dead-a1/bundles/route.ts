export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createClient } from '@supabase/supabase-js';
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

    // This API supports The Dead for A1 level
    if (bookId !== 'the-dead' && bookId !== 'the-dead-a1') {
      return NextResponse.json({
        success: false,
        error: 'This API only supports The Dead A1'
      }, { status: 400 });
    }

    console.log(`📖 Loading The Dead bundles for level: ${level}`);

    // Get bundles from BookChunk table with audio duration metadata
    const bookChunks = await prisma.bookChunk.findMany({
      where: {
        bookId: 'the-dead',
        cefrLevel: 'A1'
      },
      orderBy: { chunkIndex: 'asc' },
      select: {
        id: true,
        bookId: true,
        cefrLevel: true,
        chunkIndex: true,
        chunkText: true,
        wordCount: true,
        audioFilePath: true,
        audioDurationMetadata: true
      }
    });

    if (!bookChunks || bookChunks.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No bundles found for The Dead A1'
      }, { status: 404 });
    }

    console.log(`✅ Loaded ${bookChunks.length} bundles from BookChunk table`);

    // Convert BookChunk data to API format with proper timing
    const bundles: BundleMetadata[] = [];
    let totalSentencesProcessed = 0;

    // Initialize Supabase client once
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL as string,
      process.env.SUPABASE_SERVICE_ROLE_KEY as string
    );

    bookChunks.forEach((chunk: any, index) => {
      // Generate Supabase storage URL from relative path using API, not hardcoded domain
      const audioUrl = supabase.storage
        .from('audio-files')
        .getPublicUrl(chunk.audioFilePath!)
        .data.publicUrl;

      let sentencesWithTimings;
      let totalDuration: number;

      // Check if we have cached duration metadata
      if (chunk.audioDurationMetadata && typeof chunk.audioDurationMetadata === 'object') {
        // Use cached timings (FAST PATH - 2-3 seconds)
        const metadata = chunk.audioDurationMetadata as any;
        console.log(`Bundle ${index}: Using cached duration ${metadata.measuredDuration?.toFixed(3)}s`);

        totalDuration = metadata.measuredDuration || 0;

        // Use cached sentence timings if available (PREFERRED PATH - exact boundaries)
        if (metadata.sentenceTimings && Array.isArray(metadata.sentenceTimings)) {
          sentencesWithTimings = metadata.sentenceTimings.map((timing: any, idx: number) => ({
            sentenceId: `s${timing.sentenceIndex}`,
            sentenceIndex: timing.sentenceIndex, // Use the original sentenceIndex from metadata
            text: timing.text,
            startTime: timing.startTime,
            endTime: timing.endTime
          }));
        } else if (metadata.exactSentences && Array.isArray(metadata.exactSentences)) {
          // Fallback: use exact sentences from generation with estimated timing
          const totalWords = metadata.exactSentences.reduce((sum: number, sentence: string) =>
            sum + sentence.split(/\s+/).length, 0
          );

          let currentTime = 0;
          sentencesWithTimings = metadata.exactSentences.map((text: string, sentenceIdx: number) => {
            const words = text.trim().split(/\s+/).length;
            const wordRatio = words / totalWords;
            const estimatedDuration = (metadata.estimatedDuration || totalDuration) * wordRatio;

            const startTime = currentTime;
            const endTime = currentTime + estimatedDuration;
            currentTime = endTime;

            return {
              sentenceId: `s${totalSentencesProcessed + sentenceIdx}`,
              sentenceIndex: totalSentencesProcessed + sentenceIdx,
              text: text.trim(),
              startTime: parseFloat(startTime.toFixed(3)),
              endTime: parseFloat(endTime.toFixed(3))
            };
          });
        } else {
          // Fallback: split text and use proportional timing from cached duration
          const chunkSentences = chunk.chunkText
            .split(/(?<=[.!?])\s+/)
            .map((s: string) => s.trim())
            .filter((s: string) => s.length > 5);

          const totalWords = chunkSentences.reduce((sum: number, sentence: string) =>
            sum + sentence.split(/\s+/).length, 0
          );

          let currentTime = 0;
          sentencesWithTimings = chunkSentences.map((text: string, sentenceIdx: number) => {
            const words = text.trim().split(/\s+/).length;
            const wordRatio = words / totalWords;
            const estimatedDuration = totalDuration * wordRatio;

            const startTime = currentTime;
            const endTime = currentTime + estimatedDuration;
            currentTime = endTime;

            return {
              sentenceId: `s${totalSentencesProcessed + sentenceIdx}`,
              sentenceIndex: totalSentencesProcessed + sentenceIdx,
              text: text.trim(),
              startTime: parseFloat(startTime.toFixed(3)),
              endTime: parseFloat(endTime.toFixed(3))
            };
          });
        }
      } else {
        // NO CACHED DATA - Use estimation fallback
        console.log(`Bundle ${index}: No cached data, using estimation`);

        const chunkSentences = chunk.chunkText
          .split(/(?<=[.!?])\s+/)
          .map((s: string) => s.trim())
          .filter((s: string) => s.length > 5);

        let cumulativeTime = 0;
        sentencesWithTimings = chunkSentences.map((text: string, sentenceIdx: number) => {
          const words = text.trim().split(/\s+/).length;
          const secondsPerWord = 0.35;
          const lengthPenalty = words > 12 ? (words - 12) * 0.03 : 0;
          const buffer = 0.20;
          const duration = words * secondsPerWord + lengthPenalty + buffer;

          const startTime = cumulativeTime;
          const endTime = startTime + duration;
          cumulativeTime = endTime;

          return {
            sentenceId: `s${totalSentencesProcessed + sentenceIdx}`,
            sentenceIndex: totalSentencesProcessed + sentenceIdx,
            text: text.trim(),
            startTime: parseFloat(startTime.toFixed(3)),
            endTime: parseFloat(endTime.toFixed(3))
          };
        });
        totalDuration = cumulativeTime;
      }

      const bundle = {
        bundleId: `bundle_${index}`,
        bundleIndex: index,
        audioUrl,
        totalDuration: parseFloat(totalDuration.toFixed(3)),
        sentences: sentencesWithTimings
      };

      bundles.push(bundle);
      // Note: totalSentencesProcessed not needed since we use original indices from metadata
    });

    // Get book metadata
    const bookContent = await prisma.bookContent.findFirst({
      where: { bookId: 'the-dead' }
    });

    // Load chapter data (from our chapter detection)
    let chapters = null;
    try {
      const chaptersPath = path.join(process.cwd(), 'cache', 'the-dead-chapters.json');
      const chaptersData = fs.readFileSync(chaptersPath, 'utf-8');
      const chapterStructure = JSON.parse(chaptersData);

      // Convert to UI format with bundle mapping
      chapters = chapterStructure.chapters.map((ch: any, index: number) => ({
        chapterNumber: index + 1,
        title: ch.title,
        startSentence: ch.startSentence,
        endSentence: ch.endSentence,
        startBundle: Math.floor(ch.startSentence / 4), // 4 sentences per bundle
        endBundle: Math.floor(ch.endSentence / 4)
      }));
    } catch (error) {
      console.log('Could not load chapters data:', error instanceof Error ? error.message : 'Unknown error');
    }

    const totalSentences = bundles.reduce((sum, bundle) => sum + bundle.sentences.length, 0);

    return NextResponse.json({
      success: true,
      book: {
        id: bookId,
        title: bookContent?.title || 'The Dead',
        author: bookContent?.author || 'James Joyce'
      },
      level: 'A1',
      totalBundles: bundles.length,
      totalSentences,
      bundles,
      chapters, // Add chapter structure for UI
      source: 'dedicated-api' // Indicates this came from dedicated API for debugging
    });

  } catch (error) {
    console.error('The Dead A1 API error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}