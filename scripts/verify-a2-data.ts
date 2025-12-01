import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verify() {
  console.log('🔍 Verifying A2 data for "How Great Leaders Inspire Action"...\n');

  const chunks = await prisma.bookChunk.findMany({
    where: {
      bookId: 'how-great-leaders-inspire-action',
      cefrLevel: 'A2'
    },
    orderBy: { chunkIndex: 'asc' }
  });

  console.log(`📦 Found ${chunks.length} A2 chunks`);

  if (chunks.length > 0) {
    console.log(`✅ First chunk: "${chunks[0].chunkText.substring(0, 60)}..."`);
    console.log(`✅ Last chunk: "${chunks[chunks.length - 1].chunkText.substring(0, 60)}..."`);
    console.log(`✅ Audio path example: ${chunks[0].audioFilePath}`);
    console.log(`✅ Has duration metadata: ${!!chunks[0].audioDurationMetadata}`);
  } else {
    console.log('❌ No A2 chunks found!');
  }

  await prisma.$disconnect();
}

verify();
