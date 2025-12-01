import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const runtime = 'nodejs';
export const revalidate = 3600; // Cache for 1 hour

interface SentenceTiming {
  text: string;
  start: number;
  end: number;
  duration: number;
}

interface BundleResponse {
  id: string;
  text: string;
  sentences: SentenceTiming[];
  audioUrl: string;
  totalDuration: number;
}

export async function GET(request: NextRequest) {
  try {
    console.log(`📚 Fetching A2 bundles for "How Great Leaders Inspire Action"...`);

    const bookChunks = await prisma.bookChunk.findMany({
      where: {
        bookId: 'how-great-leaders-inspire-action',
        cefrLevel: 'A2'
      },
      orderBy: { chunkIndex: 'asc' },
      select: {
        id: true,
        chunkText: true,
        audioFilePath: true,
        audioDurationMetadata: true
      }
    });

    console.log(`✅ Found ${bookChunks.length} A2 chunks`);

    const bundles: BundleResponse[] = bookChunks.map(chunk => {
      let sentencesWithTimings: SentenceTiming[] = [];
      let totalDuration = 0;

      // Solution 1: Use cached duration metadata (FAST PATH)
      if (chunk.audioDurationMetadata && typeof chunk.audioDurationMetadata === 'object') {
        const metadata = chunk.audioDurationMetadata as any;
        totalDuration = metadata.measuredDuration || 0;

        if (metadata.sentenceTimings && Array.isArray(metadata.sentenceTimings)) {
          sentencesWithTimings = metadata.sentenceTimings.map((timing: any) => ({
            text: timing.text,
            start: timing.start,
            end: timing.end,
            duration: timing.duration
          }));
        }
      }

      // Fallback: No timing metadata available
      if (sentencesWithTimings.length === 0) {
        const sentences = chunk.chunkText.split(/(?<=[.!?])\s+/).filter((s: string) => s.trim());
        const avgDuration = totalDuration / sentences.length;

        sentencesWithTimings = sentences.map((text: string, idx: number) => ({
          text,
          start: idx * avgDuration,
          end: (idx + 1) * avgDuration,
          duration: avgDuration
        }));
      }

      return {
        id: chunk.id,
        text: chunk.chunkText,
        sentences: sentencesWithTimings,
        audioUrl: chunk.audioFilePath || '',
        totalDuration
      };
    });

    return NextResponse.json({
      success: true,
      bundles,
      metadata: {
        bookId: 'how-great-leaders-inspire-action',
        title: 'How Great Leaders Inspire Action',
        author: 'Simon Sinek',
        level: 'A2',
        totalBundles: bundles.length,
        voice: 'Jane',
        voiceId: 'RILOU7YmBhvwJGDGjNmP',
        speed: 0.85
      }
    });

  } catch (error) {
    console.error('❌ Error fetching A2 bundles:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch bundles',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
