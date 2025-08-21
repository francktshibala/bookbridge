// Replicate audio stats Prisma queries to debug API failure
const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  try {
    await prisma.$connect();
    const [
      totalSimplifiedChunks,
      chunksWithAudio,
      chunksWithoutAudio,
      booksWithAudioDistinct
    ] = await Promise.all([
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

    console.log(JSON.stringify({
      totalSimplifiedChunks,
      chunksWithAudio,
      chunksWithoutAudio,
      booksWithAudio: booksWithAudioDistinct.length,
      audioPercentage
    }, null, 2));
  } catch (error) {
    console.error('Test stats error:', {
      message: error.message,
      code: error.code,
      meta: error.meta,
      stack: error.stack,
    });
  } finally {
    await prisma.$disconnect();
  }
}

main();


