const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkYellowWallpaper() {
  // Check if book content exists
  const bookContent = await prisma.bookContent.findFirst({
    where: { bookId: 'gutenberg-1952' }
  });
  
  console.log('Book content exists:', !!bookContent);
  
  if (bookContent) {
    console.log('Total chunks:', bookContent.totalChunks);
    console.log('Book ID:', bookContent.bookId);
    console.log('Chunks array length:', bookContent.chunks?.length || 0);
    
    if (bookContent.chunks && bookContent.chunks.length > 0) {
      console.log('\nFirst chunk preview:');
      console.log(bookContent.chunks[0].content?.substring(0, 200) + '...');
    }
  }
  
  // Check bookChunk count
  const chunkCount = await prisma.bookChunk.count({
    where: { bookId: 'gutenberg-1952' }
  });
  console.log('\nBookChunk records:', chunkCount);
  
  // Check a specific bookChunk
  const sampleChunk = await prisma.bookChunk.findFirst({
    where: { 
      bookId: 'gutenberg-1952',
      cefrLevel: 'original',
      chunkIndex: 0
    }
  });
  
  if (sampleChunk) {
    console.log('\nOriginal chunk 0 exists');
    console.log('Text preview:', sampleChunk.chunkText.substring(0, 100) + '...');
  } else {
    console.log('\nNo original chunk found');
  }
  
  await prisma.$disconnect();
}

checkYellowWallpaper().catch(console.error);