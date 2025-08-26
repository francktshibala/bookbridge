const {PrismaClient} = require('@prisma/client');
const p = new PrismaClient();

async function listEnhanced() {
  const enhanced = await p.bookChunk.groupBy({
    by: ['bookId'],
    where: {
      isSimplified: true,
      cefrLevel: { not: 'original' }
    },
    _count: true
  });
  
  const books = await p.book.findMany({
    where: { id: { in: enhanced.map(x => x.bookId) } },
    select: { id: true, title: true }
  });
  
  books.forEach(book => console.log(`${book.title} (${book.id})`));
  process.exit(0);
}

listEnhanced();