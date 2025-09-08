const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixYellowWallpaperContent() {
  console.log('🔧 Fixing Yellow Wallpaper bookContent...');
  
  // Get all original chunks from bookChunk table
  const originalChunks = await prisma.bookChunk.findMany({
    where: { 
      bookId: 'gutenberg-1952',
      cefrLevel: 'original'
    },
    orderBy: { chunkIndex: 'asc' }
  });
  
  console.log(`Found ${originalChunks.length} original chunks`);
  
  // Build the chunks array for bookContent
  const chunks = originalChunks.map(chunk => ({
    content: chunk.chunkText.replace("Here's the simplified version:\n\n", ''), // Remove any intro from original
    start: chunk.chunkIndex * 1000, // Approximate positions
    end: (chunk.chunkIndex + 1) * 1000
  }));
  
  // Update bookContent with proper chunks array
  const updated = await prisma.bookContent.update({
    where: { bookId: 'gutenberg-1952' },
    data: {
      chunks: chunks,
      totalChunks: chunks.length
    }
  });
  
  console.log(`✅ Updated bookContent with ${chunks.length} chunks`);
  
  // Verify the fix
  const verification = await prisma.bookContent.findFirst({
    where: { bookId: 'gutenberg-1952' }
  });
  
  console.log('\nVerification:');
  console.log('- Total chunks:', verification.totalChunks);
  console.log('- Chunks array length:', verification.chunks?.length || 0);
  console.log('- First chunk preview:', verification.chunks[0]?.content?.substring(0, 100) + '...');
  
  await prisma.$disconnect();
}

fixYellowWallpaperContent().catch(console.error);