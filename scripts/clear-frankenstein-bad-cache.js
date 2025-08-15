const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  console.log('=== CLEARING FAILED FRANKENSTEIN SIMPLIFICATIONS ===');
  
  // First check what we have
  const existing = await prisma.bookSimplification.findMany({
    where: { bookId: 'gutenberg-84' },
    select: { 
      targetLevel: true,
      qualityScore: true,
      originalText: true,
      simplifiedText: true
    },
    take: 5
  });
  
  console.log('Sample entries before deletion:');
  existing.forEach(e => {
    const identical = e.originalText === e.simplifiedText;
    console.log(`  ${e.targetLevel}: quality=${e.qualityScore}, identical=${identical}`);
  });
  
  // Delete all Frankenstein simplifications
  const deleted = await prisma.bookSimplification.deleteMany({
    where: { bookId: 'gutenberg-84' }
  });
  
  console.log(`\n✅ Deleted ${deleted.count} Frankenstein simplifications`);
  console.log('Ready for fresh processing with proper AI simplification');
  
  await prisma.$disconnect();
})();