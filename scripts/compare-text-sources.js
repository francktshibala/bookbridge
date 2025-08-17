const { PrismaClient } = require('@prisma/client');
const fetch = require('node-fetch');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

async function compareTextSources() {
  console.log('🔍 COMPARING TEXT SOURCES: Display vs Audio');
  
  try {
    console.log('\n1. GETTING DISPLAY TEXT (API /content-fast)');
    const response = await fetch('http://localhost:3000/api/books/gutenberg-1342/content-fast');
    const apiData = await response.json();
    const apiText = apiData.context;
    
    // Split into 1500-char chunks like the reading interface does
    const chunkSize = 1500;
    const displayChunks = [];
    for (let i = 0; i < apiText.length; i += chunkSize) {
      displayChunks.push({
        index: displayChunks.length,
        text: apiText.substring(i, i + chunkSize)
      });
    }
    
    console.log(`✅ Display chunks: ${displayChunks.length} (1500 chars each)`);
    console.log(`Display chunk 0: "${displayChunks[0]?.text.substring(0, 80)}..."`);
    console.log(`Display chunk 1: "${displayChunks[1]?.text.substring(0, 80)}..."`);
    
    console.log('\n2. GETTING AUDIO TEXT (Database BookChunks)');
    const dbChunks = await prisma.bookChunk.findMany({
      where: {
        bookId: 'gutenberg-1342',
        cefrLevel: 'original'
      },
      orderBy: { chunkIndex: 'asc' },
      select: {
        chunkIndex: true,
        chunkText: true
      }
    });
    
    console.log(`✅ Database chunks: ${dbChunks.length}`);
    console.log(`DB chunk 0: "${dbChunks[0]?.chunkText.substring(0, 80)}..."`);
    console.log(`DB chunk 1: "${dbChunks[1]?.chunkText.substring(0, 80)}..."`);
    
    console.log('\n3. TEXT ALIGNMENT CHECK');
    
    // Check first few chunks for alignment
    for (let i = 0; i < Math.min(3, displayChunks.length, dbChunks.length); i++) {
      const displayText = displayChunks[i]?.text || '';
      const dbText = dbChunks[i]?.chunkText || '';
      
      // Normalize whitespace for comparison
      const displayNorm = displayText.substring(0, 200).replace(/\s+/g, ' ').trim();
      const dbNorm = dbText.substring(0, 200).replace(/\s+/g, ' ').trim();
      
      const isMatch = displayNorm === dbNorm;
      
      console.log(`\nChunk ${i}: ${isMatch ? '✅ MATCH' : '❌ MISMATCH'}`);
      
      if (!isMatch) {
        console.log(`  Display: "${displayNorm.substring(0, 60)}..."`);
        console.log(`  DB:      "${dbNorm.substring(0, 60)}..."`);
        
        // Check if it's just offset (display might start later)
        const dbInDisplay = displayNorm.includes(dbNorm.substring(0, 30));
        const displayInDb = dbNorm.includes(displayNorm.substring(0, 30));
        
        if (dbInDisplay || displayInDb) {
          console.log(`  📝 Appears to be chunk boundary offset`);
        } else {
          console.log(`  🚨 Completely different text sources!`);
        }
      }
    }
    
    console.log('\n4. SOLUTION ANALYSIS');
    if (displayChunks.length !== dbChunks.length) {
      console.log('❌ Different chunk counts - this will cause audio/display misalignment');
      console.log(`   Display uses ${chunkSize}-char chunks: ${displayChunks.length} total`);
      console.log(`   Database has: ${dbChunks.length} chunks`);
    }
    
    console.log('\n5. RECOMMENDED FIXES:');
    console.log('A. Update IntegratedAudioControls to use display text directly instead of precomputed chunks');
    console.log('B. Regenerate database chunks using same 1500-char boundaries as display');
    console.log('C. Modify reading interface to use database chunks instead of API splitting');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

compareTextSources();