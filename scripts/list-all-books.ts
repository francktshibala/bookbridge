import prisma from '../lib/prisma';

async function listAllBooks() {
  try {
    console.log('📚 Listing all books in database...');
    
    const books = await prisma.book.findMany({
      select: { 
        id: true, 
        title: true, 
        author: true,
        publicDomain: true
      }
    });
    
    console.log(`✅ Found ${books.length} books in database:`);
    books.forEach((book, index) => {
      console.log(`${index + 1}. ${book.title} by ${book.author} (ID: ${book.id})`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

listAllBooks();