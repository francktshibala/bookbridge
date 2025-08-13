const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testSimplificationGeneration() {
  console.log('=== TESTING SIMPLIFICATION GENERATION ===');
  
  try {
    const bookId = 'gutenberg-1342';
    
    // Check existing simplifications
    const existing = await prisma.bookSimplification.count({
      where: { bookId: bookId }
    });
    
    console.log(`📊 Existing simplifications for ${bookId}: ${existing}`);
    
    if (existing > 0) {
      console.log('🗑️  Clearing existing simplifications for fresh generation...');
      
      const deleted = await prisma.bookSimplification.deleteMany({
        where: { bookId: bookId }
      });
      
      console.log(`✅ Cleared ${deleted.count} existing simplifications`);
    }
    
    // Now test one simplification generation
    console.log('\n🤖 Testing AI simplification generation...');
    
    const apiUrl = `http://localhost:3003/api/books/${bookId}/simplify?level=A1&chunk=0&ai=true`;
    
    const response = await fetch(apiUrl);
    const result = await response.json();
    
    console.log(`📊 Response: ${response.status}`);
    console.log(`📋 Source: ${result.source}`);
    console.log(`🎯 Success: ${result.success}`);
    
    if (result.aiMetadata) {
      console.log(`🤖 AI Quality: ${result.aiMetadata.quality}`);
      console.log(`📈 AI Similarity: ${result.aiMetadata.similarity}`);
      console.log(`📚 Detected Era: ${result.aiMetadata.detectedEra}`);
    }
    
    if (result.microHint) {
      console.log(`💡 Hint: ${result.microHint}`);
    }
    
    // Check if simplification was cached
    const newCount = await prisma.bookSimplification.count({
      where: { bookId: bookId }
    });
    
    console.log(`📊 New simplifications count: ${newCount}`);
    
    if (newCount > 0) {
      console.log('✅ SUCCESS: AI simplification generated and cached!');
      console.log('🚀 Ready to proceed with bulk generation');
    } else {
      console.log('❌ No new simplifications were cached');
      if (result.source === 'fallback_chunked') {
        console.log('💡 AI simplification failed quality gate, returned original text');
      }
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testSimplificationGeneration();