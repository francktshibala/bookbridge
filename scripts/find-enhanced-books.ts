import { prisma } from '../lib/prisma';

async function findEnhancedBooks() {
  try {
    // Find all books that have at least one simplified chunk
    const enhancedBooks = await prisma.bookContent.findMany({
      where: {
        chunks: {
          some: {
            isSimplified: true
          }
        }
      },
      include: {
        chunks: {
          where: {
            isSimplified: true
          },
          select: {
            cefrLevel: true,
            chunkIndex: true,
            wordCount: true,
            qualityScore: true
          }
        },
        _count: {
          select: {
            chunks: {
              where: {
                isSimplified: true
              }
            }
          }
        }
      },
      orderBy: {
        title: 'asc'
      }
    });

    console.log(`Found ${enhancedBooks.length} enhanced books with simplified content:\n`);

    for (const book of enhancedBooks) {
      console.log(`📚 ${book.title} by ${book.author}`);
      console.log(`   Book ID: ${book.bookId}`);
      console.log(`   Total word count: ${book.wordCount}`);
      console.log(`   Simplified chunks: ${book._count.chunks}`);
      
      // Count chunks by CEFR level
      const levelCounts = book.chunks.reduce((acc, chunk) => {
        acc[chunk.cefrLevel] = (acc[chunk.cefrLevel] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      console.log(`   CEFR levels available:`);
      Object.entries(levelCounts).forEach(([level, count]) => {
        console.log(`     - ${level}: ${count} chunks`);
      });
      
      console.log('');
    }

    // Summary statistics
    const totalSimplifiedChunks = await prisma.bookChunk.count({
      where: {
        isSimplified: true
      }
    });

    const simplifiedChunksByLevel = await prisma.bookChunk.groupBy({
      by: ['cefrLevel'],
      where: {
        isSimplified: true
      },
      _count: true,
      orderBy: {
        cefrLevel: 'asc'
      }
    });

    console.log('📊 Summary Statistics:');
    console.log(`   Total enhanced books: ${enhancedBooks.length}`);
    console.log(`   Total simplified chunks: ${totalSimplifiedChunks}`);
    console.log(`   Chunks by CEFR level:`);
    simplifiedChunksByLevel.forEach(({ cefrLevel, _count }) => {
      console.log(`     - ${cefrLevel}: ${_count} chunks`);
    });

  } catch (error) {
    console.error('Error querying enhanced books:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
findEnhancedBooks();