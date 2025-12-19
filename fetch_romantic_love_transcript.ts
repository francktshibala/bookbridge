import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fetchTranscript() {
  console.log('📝 Fetching transcript for romantic-love-1 (bundles 0-9)...\n');

  try {
    // Fetch chunks 0-9 for romantic-love-1
    const bundles = await prisma.bookChunk.findMany({
      where: {
        bookId: 'romantic-love-1',
        chunkIndex: {
          gte: 0,
          lte: 9
        }
      },
      orderBy: {
        chunkIndex: 'asc'
      },
      select: {
        chunkIndex: true,
        chunkText: true
      }
    });

    if (bundles.length === 0) {
      console.log('❌ No bundles found for romantic-love-1');
      return;
    }

    console.log(`✅ Found ${bundles.length} chunks\n`);
    console.log('# I Hid My Love for 5 Years - Part 1 Transcript');
    console.log('# Chunks 0-9\n');
    console.log('---\n');

    let fullText = '';

    bundles.forEach(bundle => {
      console.log(`## Chunk ${bundle.chunkIndex}`);
      console.log('');

      const text = bundle.chunkText;
      console.log(text);
      console.log('');

      fullText += text + ' ';
    });

    console.log('---\n');
    console.log(`**Total chunks:** ${bundles.length}`);
    console.log(`**Total words:** ~${fullText.split(' ').length}`);
    console.log(`**Duration:** ~4m 30s (with 3s pauses for shadowing)`);

  } catch (error) {
    console.error('❌ Error fetching transcript:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fetchTranscript();
