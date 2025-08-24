const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkFinalStatus() {
  const localFiles = await prisma.bookChunk.count({
    where: { 
      bookId: 'gutenberg-1342',
      audioFilePath: { startsWith: '/audio/' }
    }
  });

  const supabaseFiles = await prisma.bookChunk.count({
    where: { 
      bookId: 'gutenberg-1342',
      audioFilePath: { startsWith: 'https://xsolwqqdbsuydwmmwtsl.supabase.co' }
    }
  });

  const totalWithAudio = await prisma.bookChunk.count({
    where: { 
      bookId: 'gutenberg-1342',
      audioFilePath: { not: null }
    }
  });

  console.log('🎉 FINAL MIGRATION STATUS:');
  console.log('- Local files remaining: ' + localFiles);
  console.log('- Supabase CDN files: ' + supabaseFiles);
  console.log('- Total files with audio: ' + totalWithAudio);
  console.log('- Migration progress: ' + Math.round((supabaseFiles / totalWithAudio) * 100) + '%');
  
  if (localFiles === 0) {
    console.log('\n✅ 100% MIGRATION COMPLETE!');
    console.log('🌍 All audio files are now served from Supabase global CDN');
    console.log('🚀 Ready for Vercel deployment with instant audio worldwide!');
  }
  
  await prisma.$disconnect();
}

checkFinalStatus();