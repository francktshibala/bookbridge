const { PrismaClient } = require('@prisma/client');

const bookId = process.argv[2];
const targetLevel = process.argv[3];

if (!bookId || !targetLevel) {
  console.error('Usage: node copy-simplifications-to-chunks.js <bookId> <targetLevel>');
  process.exit(1);
}

const prisma = new PrismaClient();

async function copySimplificationsToChunks() {
  try {
    console.log(`Copying ${bookId} ${targetLevel} simplifications to chunks table...`);
    
    // Get all simplifications for this book and level
    const simplifications = await prisma.bookSimplification.findMany({
      where: {
        bookId: bookId,
        targetLevel: targetLevel
      },
      orderBy: {
        chunkIndex: 'asc'
      }
    });

    if (simplifications.length === 0) {
      console.log(`No simplifications found for ${bookId} ${targetLevel}`);
      return;
    }

    console.log(`Found ${simplifications.length} simplifications to copy`);

    // Copy each simplification to book_chunks table
    for (const simp of simplifications) {
      await prisma.bookChunk.upsert({
        where: {
          bookId_cefrLevel_chunkIndex: {
            bookId: bookId,
            cefrLevel: targetLevel,
            chunkIndex: simp.chunkIndex
          }
        },
        update: {
          chunkText: simp.simplifiedText,
          isSimplified: true,
          qualityScore: simp.qualityScore
        },
        create: {
          bookId: bookId,
          cefrLevel: targetLevel,
          chunkIndex: simp.chunkIndex,
          chunkText: simp.simplifiedText,
          wordCount: simp.simplifiedText.split(' ').length,
          isSimplified: true,
          qualityScore: simp.qualityScore
        }
      });
    }

    console.log(`✅ Successfully copied ${simplifications.length} chunks for ${bookId} ${targetLevel}`);
    
  } catch (error) {
    console.error('Error copying simplifications:', error);
  } finally {
    await prisma.$disconnect();
  }
}

copySimplificationsToChunks();