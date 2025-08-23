import { prisma } from '../lib/prisma';

async function checkLevels() {
  try {
    const levels = await prisma.bookChunk.groupBy({
      by: ['cefrLevel'],
      where: { bookId: 'pride-and-prejudice' },
      _count: true
    });
    
    console.log('Existing levels for Pride & Prejudice:');
    levels.forEach(l => console.log(`  ${l.cefrLevel}: ${l._count} chunks`));
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkLevels();