const { createClient } = require('@supabase/supabase-js');
const { PrismaClient } = require('@prisma/client');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const prisma = new PrismaClient();

(async () => {
  console.log('=== CLEARING CACHE AND TESTING AI ===');
  
  try {
    // Clear cached simplifications for this book/level/chunk
    console.log('🧹 Clearing cached simplifications...');
    const deleted = await prisma.bookSimplification.deleteMany({
      where: {
        bookId: 'gutenberg-100',
        targetLevel: 'B1',
        chunkIndex: 4
      }
    });
    console.log(`✅ Deleted ${deleted.count} cached entries`);
    
  } catch (error) {
    console.log('❌ Cache clear error:', error.message);
  }
  
  console.log('\n🔥 Testing API with fresh cache...');
  
  // Test the API again without cache
  try {
    const testUrl = 'http://localhost:3000/api/books/gutenberg-100/simplify?level=B1&chunk=4&ai=true';
    
    const response = await fetch(testUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('📊 Response status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      
      console.log('\n🔍 Key results:');
      console.log('- Source:', data.source);
      console.log('- Has AI Metadata:', !!data.aiMetadata);
      console.log('- Quality Score:', data.qualityScore);
      console.log('- Micro Hint:', data.microHint);
      
      if (data.aiMetadata) {
        console.log('- AI Quality:', data.aiMetadata.quality);
        console.log('- AI Similarity:', data.aiMetadata.similarity);
        console.log('- Passed Gate:', data.aiMetadata.passedSimilarityGate);
      }
      
      // Check if AI was used
      if (data.source === 'ai_simplified') {
        console.log('🎉 AI simplification SUCCESS!');
      } else {
        console.log('❌ AI simplification still not used. Source:', data.source);
        console.log('Full response:', JSON.stringify(data, null, 2));
      }
    } else {
      const errorText = await response.text();
      console.log('❌ API Error:', errorText);
    }
    
  } catch (error) {
    console.log('💥 Request failed:', error.message);
  }
  
  await prisma.$disconnect();
})();