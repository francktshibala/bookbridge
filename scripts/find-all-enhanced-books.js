const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findAllEnhancedBooks() {
  // Check for books with simplified versions (different approach)
  const allBooks = await prisma.bookChunk.findMany({
    where: { 
      AND: [
        { cefrLevel: { not: 'original' } },
        { chunkText: { not: null } }
      ]
    },
    select: { bookId: true, cefrLevel: true },
    distinct: ['bookId', 'cefrLevel']
  });
  
  // Group by bookId
  const bookGroups = {};
  allBooks.forEach(chunk => {
    if (!bookGroups[chunk.bookId]) bookGroups[chunk.bookId] = [];
    bookGroups[chunk.bookId].push(chunk.cefrLevel);
  });
  
  console.log('📚 ALL books with enhanced simplifications:');
  Object.entries(bookGroups).forEach(([bookId, levels]) => {
    const sortedLevels = [...new Set(levels)].sort();
    console.log(`- ${bookId}: [${sortedLevels.join(', ')}]`);
  });
  
  await prisma.$disconnect();
}

findAllEnhancedBooks();