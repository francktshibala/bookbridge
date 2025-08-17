// Clear Picture of Dorian Gray cache
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    const deleted = await prisma.bookSimplification.deleteMany({
      where: { bookId: 'gutenberg-174' }
    });
    console.log('✅ Deleted', deleted.count, 'Picture of Dorian Gray simplifications');
    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Error:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
})();