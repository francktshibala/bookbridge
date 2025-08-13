const { createClient } = require('@supabase/supabase-js');

// Service role client 
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testTTSGeneration() {
  console.log('🎵 Testing TTS generation with existing data...');

  try {
    // Check what books are available
    const { data: books, error: booksError } = await supabase
      .from('books')
      .select('id, title')
      .limit(3);

    if (booksError) {
      console.error('❌ Error fetching books:', booksError.message);
      return;
    }

    console.log(`📚 Found ${books?.length || 0} books:`);
    books?.forEach(book => {
      console.log(`  ${book.id} - ${book.title}`);
    });

    if (books && books.length > 0) {
      const testBook = books[0];
      console.log(`\\n🎯 Testing with book: ${testBook.title}`);

      // Test the TTS API endpoint directly
      const testUrl = `http://localhost:3002/api/precompute/tts?bookId=${testBook.id}&cefrLevel=B2&chunkIndex=0&voiceId=alloy`;
      
      console.log('🔍 Testing TTS API:', testUrl);
      
      try {
        const response = await fetch(testUrl);
        const status = response.status;
        
        if (status === 404) {
          console.log('📝 Expected: No precomputed audio yet (404)');
        } else if (status === 200) {
          console.log('🎉 Success: Found precomputed audio!');
        } else {
          const errorText = await response.text();
          console.log(`⚠️  Status ${status}: ${errorText}`);
        }
        
      } catch (fetchError) {
        console.error('❌ Fetch error:', fetchError.message);
      }
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testTTSGeneration();