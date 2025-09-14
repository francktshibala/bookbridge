const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixYellowWallpaperChunks() {
  console.log('🔧 Fixing Yellow Wallpaper chunks...');
  
  // Get all simplifications for Yellow Wallpaper
  const simplifications = await prisma.bookSimplification.findMany({
    where: { bookId: 'gutenberg-1952' },
    orderBy: { chunkIndex: 'asc' },
    distinct: ['chunkIndex']
  });
  
  console.log(`Found ${simplifications.length} simplification chunks`);
  
  // Check if we already have BookChunk records
  const existingChunks = await prisma.bookChunk.count({
    where: { 
      bookId: 'gutenberg-1952',
      cefrLevel: 'original'
    }
  });
  
  console.log(`Found ${existingChunks} existing BookChunk records`);
  
  if (existingChunks === 0) {
    // Create BookChunk records from simplifications
    console.log('Creating BookChunk records from simplifications...');
    
    for (const simplification of simplifications) {
      await prisma.bookChunk.create({
        data: {
          bookId: 'gutenberg-1952',
          cefrLevel: 'original',
          chunkIndex: simplification.chunkIndex,
          chunkText: simplification.originalText,
          wordCount: simplification.originalText.split(/\s+/).length,
          isSimplified: false
        }
      });
    }
    
    console.log(`✅ Created ${simplifications.length} BookChunk records`);
  }
  
  // Update or create BookContent record
  const bookContent = await prisma.bookContent.findUnique({
    where: { bookId: 'gutenberg-1952' }
  });
  
  if (bookContent) {
    console.log('BookContent exists, updating totalChunks...');
    await prisma.bookContent.update({
      where: { bookId: 'gutenberg-1952' },
      data: { totalChunks: simplifications.length }
    });
  } else {
    console.log('Creating BookContent record...');
    const fullText = simplifications
      .sort((a, b) => a.chunkIndex - b.chunkIndex)
      .map(s => s.originalText)
      .join('\n\n');
      
    await prisma.bookContent.create({
      data: {
        bookId: 'gutenberg-1952',
        title: 'The Yellow Wallpaper',
        author: 'Charlotte Perkins Gilman',
        fullText: fullText,
        wordCount: fullText.split(/\s+/).length,
        totalChunks: simplifications.length,
        era: 'american-19c'
      }
    });
  }
  
  // Verify the fix
  const verification = await prisma.bookContent.findUnique({
    where: { bookId: 'gutenberg-1952' },
    include: { chunks: { take: 1 } }
  });
  
  console.log('\nVerification:');
  console.log('- BookContent exists:', !!verification);
  console.log('- Total chunks:', verification?.totalChunks);
  console.log('- BookChunk relation count:', verification?.chunks?.length || 0);
  console.log('- First chunk preview:', verification?.chunks[0]?.chunkText?.substring(0, 100) + '...');
  
  await prisma.$disconnect();
}

fixYellowWallpaperChunks().catch(console.error);