import { prisma } from '../lib/prisma';

async function checkBookChunks() {
  try {
    // Check distinct book IDs in book_chunks
    const distinctBooks = await prisma.bookChunk.findMany({
      distinct: ['bookId'],
      select: {
        bookId: true
      }
    });
    
    console.log('Books with chunks:');
    distinctBooks.forEach(book => console.log(`  ${book.bookId}`));
    
    // Check gutenberg-1342 specifically
    const gutenberg1342Levels = await prisma.bookChunk.groupBy({
      by: ['cefrLevel'],
      where: { bookId: 'gutenberg-1342' },
      _count: true
    });
    
    console.log('\nChunk levels for gutenberg-1342:');
    gutenberg1342Levels.forEach(level => console.log(`  ${level.cefrLevel}: ${level._count} chunks`));
    
    // Check if there are any chunks at all for this book
    const totalChunks = await prisma.bookChunk.count({
      where: { bookId: 'gutenberg-1342' }
    });
    
    console.log(`\nTotal chunks for gutenberg-1342: ${totalChunks}`);
    
    // Check if there are book_simplifications instead
    const simplifications = await prisma.bookSimplification.groupBy({
      by: ['targetLevel'],
      where: { bookId: 'gutenberg-1342' },
      _count: true
    });
    
    console.log('\nSimplifications for gutenberg-1342:');
    simplifications.forEach(simp => console.log(`  ${simp.targetLevel}: ${simp._count} simplifications`));
    
    // Check pride-and-prejudice too
    const prideChunks = await prisma.bookChunk.groupBy({
      by: ['cefrLevel'],
      where: { bookId: 'pride-and-prejudice' },
      _count: true
    });
    
    console.log('\nChunk levels for pride-and-prejudice:');
    prideChunks.forEach(level => console.log(`  ${level.cefrLevel}: ${level._count} chunks`));
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkBookChunks();