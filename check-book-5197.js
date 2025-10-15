import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkBook() {
  try {
    const book = await prisma.book.findUnique({
      where: { id: 'gutenberg-5197' },
      select: {
        id: true,
        title: true,
        author: true,
        wordCount: true,
        totalChunks: true
      }
    });

    if (!book) {
      console.log('❌ Book gutenberg-5197 not found in database');
      return;
    }

    console.log('📚 Book Details:');
    console.log(`Title: ${book.title}`);
    console.log(`Author: ${book.author}`);
    console.log(`Word Count: ${book.wordCount || 'Unknown'}`);
    console.log(`Total Chunks: ${book.totalChunks || 'No chunks'}`);

    // Check for existing simplifications
    const simplifications = await prisma.bookSimplification.count({
      where: { bookId: 'gutenberg-5197' }
    });

    console.log(`Simplifications: ${simplifications}`);
    console.log(`Status: ${simplifications > 0 ? '⚠️ Has simplifications' : '✅ Clean slate'}`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkBook();