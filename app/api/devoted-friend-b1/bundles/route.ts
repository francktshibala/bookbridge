import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';

const prisma = new PrismaClient();

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
    const level = searchParams.get('level') || 'B1';

    if (bookId !== 'the-devoted-friend') {
      return NextResponse.json({
        success: false,
        error: 'This API only supports The Devoted Friend B1'
      }, { status: 400 });
    }

    console.log(`🤝 Loading The Devoted Friend bundles for level: ${level}`);

    const bookChunks = await prisma.bookChunk.findMany({
      where: {
        bookId: 'the-devoted-friend',
        cefrLevel: 'B1'
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
        error: 'No bundles found for The Devoted Friend B1'
      }, { status: 404 });
    }

    console.log(`✅ Loaded ${bookChunks.length} bundles from BookChunk table`);

    const bundles: BundleMetadata[] = [];
    let totalSentencesProcessed = 0;

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL as string,
      process.env.SUPABASE_SERVICE_ROLE_KEY as string
    );

    bookChunks.forEach((chunk: any, index) => {
      const audioUrl = supabase.storage
        .from('audio-files')
        .getPublicUrl(chunk.audioFilePath!)
        .data.publicUrl;

      let sentencesWithTimings;
      let totalDuration: number;

      if (chunk.audioDurationMetadata && typeof chunk.audioDurationMetadata === 'object') {
        const metadata = chunk.audioDurationMetadata as any;
        totalDuration = metadata.measuredDuration || 0;

        if (metadata.sentenceTimings && Array.isArray(metadata.sentenceTimings)) {
          sentencesWithTimings = metadata.sentenceTimings.map((timing: any, idx: number) => ({
            sentenceId: `s${totalSentencesProcessed + idx}`,
            sentenceIndex: totalSentencesProcessed + idx,
            text: timing.text,
            startTime: timing.startTime,
            endTime: timing.endTime
          }));
        } else {
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
      totalSentencesProcessed += sentencesWithTimings.length;
    });

    const bookContent = await prisma.bookContent.findFirst({
      where: { bookId: 'the-devoted-friend' }
    });

    const totalSentences = bundles.reduce((sum, bundle) => sum + bundle.sentences.length, 0);

    return NextResponse.json({
      success: true,
      book: {
        id: bookId,
        title: bookContent?.title || 'The Devoted Friend',
        author: bookContent?.author || 'Oscar Wilde'
      },
      level: 'B1',
      totalBundles: bundles.length,
      totalSentences,
      bundles,
      source: 'dedicated-api'
    });

  } catch (error) {
    console.error('The Devoted Friend B1 API error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}