// Quick test script for Open Library API
const { openLibraryAPI } = require('./lib/book-sources/openlibrary-api.ts');

async function testOpenLibrary() {
  console.log('Testing Open Library API...\n');
  
  try {
    // Test 1: Search for a popular book
    console.log('1. Testing search for "Pride and Prejudice"...');
    const searchResults = await openLibraryAPI.searchBooksStandard('Pride and Prejudice', 1);
    console.log(`Found ${searchResults.totalCount} books`);
    console.log('First result:', searchResults.books[0]);
    console.log('\n---\n');
    
    // Test 2: Get popular books
    console.log('2. Testing popular books...');
    const popularBooks = await openLibraryAPI.getPopularBooksStandard(1);
    console.log(`Found ${popularBooks.totalCount} popular books`);
    console.log('First 3 popular books:');
    popularBooks.books.slice(0, 3).forEach((book, i) => {
      console.log(`${i + 1}. "${book.title}" by ${book.author} (popularity: ${book.popularity})`);
    });
    console.log('\n---\n');
    
    // Test 3: Check if we get Internet Archive IDs
    console.log('3. Checking Internet Archive integration...');
    const bookWithIA = searchResults.books[0];
    if (bookWithIA && bookWithIA.downloadUrl) {
      console.log(`✓ Book has Internet Archive URL: ${bookWithIA.downloadUrl}`);
    } else {
      console.log('✗ No Internet Archive URL found');
    }
    
  } catch (error) {
    console.error('Error testing Open Library API:', error);
  }
}

testOpenLibrary();