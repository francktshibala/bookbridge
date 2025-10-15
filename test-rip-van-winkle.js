import { gutenbergAPI } from './lib/book-sources/gutenberg-api';

async function testBook() {
  try {
    console.log('📖 Fetching The Legend of Sleepy Hollow...');
    const book = await gutenbergAPI.getBook(41);

    if (!book) {
      console.log('❌ Book not found');
      return;
    }

    console.log('Title:', book.title);
    console.log('Authors:', book.authors.map(a => a.name));

    console.log('📋 Available formats:');
    Object.keys(book.formats).forEach(format => {
      console.log(`  ${format}: ${book.formats[format]}`);
    });

    // Try different text format options
    const textUrl = book.formats['text/plain; charset=utf-8'] ||
                   book.formats['text/plain; charset=us-ascii'] ||
                   book.formats['text/plain'] ||
                   book.formats['text/plain; charset=iso-8859-1'];

    if (textUrl) {
      console.log('📥 Downloading text from:', textUrl);
      const content = await gutenbergAPI.fetchBookContent(textUrl);
      console.log('✅ Text length:', content.length, 'characters');
      console.log('📊 Estimated words:', Math.floor(content.length / 5));
      console.log('📝 First 200 chars:', content.substring(0, 200));
    } else {
      console.log('❌ No suitable text format found');
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

testBook();