const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  try {
    const books = await prisma.book.findMany({
      select: { id: true, title: true, filename: true },
      take: 5
    });
    
    console.log('Found books:', books.length);
    books.forEach(book => {
      console.log(`- ${book.title} (${book.id}) - has file: ${!!book.filename}`);
    });
    
    // Check book cache
    const cacheEntries = await prisma.bookCache.findMany({
      select: { bookId: true, indexed: true, totalChunks: true },
      take: 5
    });
    
    console.log('\nCache entries:', cacheEntries.length);
    cacheEntries.forEach(entry => {
      console.log(`- Book ${entry.bookId}: ${entry.totalChunks} chunks, indexed: ${entry.indexed}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();