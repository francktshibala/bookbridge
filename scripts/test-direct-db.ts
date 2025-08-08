import prisma from '../lib/prisma';

async function testDirectDB() {
  try {
    console.log('🔍 Testing direct database queries...');
    
    // Test books query
    const books = await prisma.book.findMany({
      select: { id: true, title: true, avgRating: true, reviewCount: true },
      take: 3
    });
    console.log('✅ Books with review data:', books);
    
    // Test reviews query for a specific book if exists
    if (books.length > 0) {
      const reviews = await prisma.review.findMany({
        where: { bookId: books[0].id },
        include: {
          user: {
            select: { id: true, name: true, email: true }
          }
        }
      });
      console.log(`✅ Reviews for ${books[0].title}:`, reviews);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testDirectDB();