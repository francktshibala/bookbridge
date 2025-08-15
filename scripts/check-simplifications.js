const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  // Check recent simplifications
  const recent = await prisma.bookSimplification.findMany({
    where: {
      bookId: 'gutenberg-1342',
      targetLevel: { in: ['A1', 'A2'] }
    },
    select: {
      targetLevel: true,
      chunkIndex: true,
      qualityScore: true,
      createdAt: true,
      originalText: true,
      simplifiedText: true
    },
    orderBy: { createdAt: 'desc' },
    take: 3
  });
  
  console.log('=== RECENT SIMPLIFICATIONS FOR PRIDE & PREJUDICE ===');
  
  for (const s of recent) {
    console.log('');
    console.log('Level:', s.targetLevel, '| Chunk:', s.chunkIndex, '| Quality:', s.qualityScore);
    console.log('Created:', s.createdAt);
    
    // Compare first 100 chars
    const orig = s.originalText.substring(0, 100);
    const simp = s.simplifiedText.substring(0, 100);
    
    console.log('Original:', orig);
    console.log('Simplified:', simp);
    
    if (orig === simp) {
      console.log('⚠️  WARNING: Text is IDENTICAL!');
    } else {
      // Calculate simple difference
      const origWords = orig.split(' ');
      const simpWords = simp.split(' ');
      let different = 0;
      for (let i = 0; i < Math.min(origWords.length, simpWords.length); i++) {
        if (origWords[i] !== simpWords[i]) different++;
      }
      console.log('✓ Text differs by', different, 'words in first 100 chars');
    }
  }
  
  await prisma.$disconnect();
})();