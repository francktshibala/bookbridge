// Test if the simplification fix is working
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testSimplificationFix() {
  console.log('=== TESTING SIMPLIFICATION FIX ===');
  
  const bookId = 'gutenberg-1342'; // Pride & Prejudice
  
  try {
    // Clear A1 cache to force regeneration
    console.log('\n1. Clearing A1 cache for Pride & Prejudice...');
    const deleted = await prisma.bookSimplification.deleteMany({
      where: {
        bookId: bookId,
        targetLevel: 'A1',
        chunkIndex: 0
      }
    });
    console.log(`   Deleted ${deleted.count} cached entries`);
    
    // Test the API endpoint with AI enabled
    console.log('\n2. Testing API endpoint (with ai=true)...');
    const response = await fetch('http://localhost:3000/api/books/gutenberg-1342/simplify?level=A1&chunk=0&ai=true');
    
    if (!response.ok) {
      console.error('API error:', response.status, response.statusText);
      return;
    }
    
    const data = await response.json();
    
    console.log('\n3. Response analysis:');
    console.log('   Source:', data.source);
    console.log('   Level:', data.level);
    console.log('   Content length:', data.content?.length || 0);
    
    // Get original text for comparison
    console.log('\n4. Fetching original text...');
    const origResponse = await fetch('http://localhost:3000/api/books/gutenberg-1342/content-fast');
    const origData = await origResponse.json();
    const originalChunk = origData.content.split(' ').slice(0, 400).join(' ');
    
    console.log('\n5. Text comparison:');
    console.log('\nOriginal (first 150 chars):');
    console.log(originalChunk.substring(0, 150));
    console.log('\nSimplified (first 150 chars):');
    console.log(data.content.substring(0, 150));
    
    // Check if text is identical
    if (originalChunk.substring(0, 150) === data.content.substring(0, 150)) {
      console.log('\n❌ FAILED: Text is IDENTICAL - no simplification occurred!');
      console.log('The fix did not work. AI simplification is not being triggered.');
    } else {
      // Calculate difference
      const origWords = originalChunk.toLowerCase().split(/\s+/);
      const simpWords = data.content.toLowerCase().split(/\s+/);
      const commonWords = origWords.filter(w => simpWords.includes(w));
      const similarity = commonWords.length / origWords.length;
      
      console.log('\n✅ SUCCESS: Text has been changed!');
      console.log(`   Word overlap: ${(similarity * 100).toFixed(1)}%`);
      console.log(`   Text changed: ${((1 - similarity) * 100).toFixed(1)}%`);
      
      if (similarity > 0.8) {
        console.log('   Note: Changes are minimal - may need more aggressive prompts');
      } else if (similarity < 0.6) {
        console.log('   Excellent: Significant simplification achieved!');
      }
    }
    
    // Check what got stored in database
    console.log('\n6. Checking database...');
    const stored = await prisma.bookSimplification.findFirst({
      where: {
        bookId: bookId,
        targetLevel: 'A1',
        chunkIndex: 0
      }
    });
    
    if (stored) {
      const isIdentical = stored.originalText === stored.simplifiedText;
      console.log('   Quality score:', stored.qualityScore);
      console.log('   Text identical in DB:', isIdentical);
      
      if (isIdentical && stored.qualityScore === 1.0) {
        console.log('   ⚠️  WARNING: Database has poisoned cache (identical text with quality=1.0)');
      }
    }
    
  } catch (error) {
    console.error('Test failed:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testSimplificationFix();