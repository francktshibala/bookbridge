import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    // Use a single connection via transaction to avoid pool exhaustion
    const [totalSimplifiedChunks, chunksWithAudio, chunksWithoutAudio, booksWithAudioDistinct] = await prisma.$transaction([
      prisma.bookChunk.count({
        where: {
          isSimplified: true,
          cefrLevel: { not: 'original' }
        }
      }),
      prisma.bookChunk.count({
        where: {
          isSimplified: true,
          cefrLevel: { not: 'original' },
          audioFilePath: { not: null }
        }
      }),
      prisma.bookChunk.count({
        where: {
          isSimplified: true,
          cefrLevel: { not: 'original' },
          audioFilePath: null
        }
      }),
      prisma.bookChunk.findMany({
        where: {
          isSimplified: true,
          cefrLevel: { not: 'original' },
          audioFilePath: { not: null }
        },
        distinct: ['bookId'],
        select: { bookId: true }
      })
    ]);

    const audioPercentage = totalSimplifiedChunks > 0 
      ? Math.round((chunksWithAudio / totalSimplifiedChunks) * 100) 
      : 0;

    return NextResponse.json({
      totalSimplifiedChunks,
      chunksWithAudio,
      chunksWithoutAudio,
      booksWithAudio: booksWithAudioDistinct.length,
      audioPercentage
    });

  } catch (error) {
    console.error('Audio stats error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch audio statistics' }, 
      { status: 500 }
    );
  }
}