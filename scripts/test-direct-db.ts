import prisma from '../lib/prisma';

async function testDirectDB() {
  try {
    console.log('🔍 Testing direct database queries...');
    
    // Test books query
    const books = await prisma.book.findMany({
      select: { id: true, title: true, author: true },
      take: 3
    });
    console.log('✅ Books sample:', books);
    
    // Optional: add more tests as needed
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testDirectDB();