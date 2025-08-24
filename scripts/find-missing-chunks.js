const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findMissingChunks() {
  const missingChunks = await prisma.bookChunk.findMany({
    where: { 
      bookId: 'gutenberg-1342',
      audioFilePath: { startsWith: '/audio/' }
    },
    select: { cefrLevel: true, chunkIndex: true, id: true },
    orderBy: [{ cefrLevel: 'asc' }, { chunkIndex: 'asc' }]
  });

  console.log('🔍 Missing chunks still using local paths:');
  const byLevel = {};
  missingChunks.forEach(chunk => {
    if (!byLevel[chunk.cefrLevel]) byLevel[chunk.cefrLevel] = [];
    byLevel[chunk.cefrLevel].push(chunk.chunkIndex);
  });

  Object.entries(byLevel).forEach(([level, chunks]) => {
    console.log(`${level}: ${chunks.length} chunks - [${chunks.slice(0, 10).join(', ')}${chunks.length > 10 ? '...' : ''}]`);
  });
  
  await prisma.$disconnect();
}

findMissingChunks();