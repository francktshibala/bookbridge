import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixMobyBookContent() {
  console.log('📚 Adding Moby Dick to BookContent table...');

  // Get simplification text to use as full text
  const simplification = await prisma.bookSimplification.findFirst({
    where: {
      bookId: 'gutenberg-2701',
      targetLevel: 'A1'
    },
    select: { simplifiedText: true }
  });

  if (!simplification) {
    console.log('❌ No simplification found');
    return;
  }

  // Store book content
  await prisma.bookContent.upsert({
    where: { bookId: 'gutenberg-2701' },
    update: {
      title: 'Moby Dick (Chapters 1-8)',
      author: 'Herman Melville',
      fullText: simplification.simplifiedText,
      era: 'modern',
      wordCount: simplification.simplifiedText.split(' ').length,
      totalChunks: 1
    },
    create: {
      bookId: 'gutenberg-2701',
      title: 'Moby Dick (Chapters 1-8)',
      author: 'Herman Melville',
      fullText: simplification.simplifiedText,
      era: 'modern',
      wordCount: simplification.simplifiedText.split(' ').length,
      totalChunks: 1
    }
  });

  console.log('✅ BookContent updated');

  await prisma.$disconnect();
}

fixMobyBookContent().catch(console.error);