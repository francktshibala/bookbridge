import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const BOOK_ID = 'jane-eyre-scale-test-001';

async function updateTitle() {
  console.log('📝 Updating Jane Eyre title in database...');

  try {
    const updated = await prisma.bookContent.update({
      where: { bookId: BOOK_ID },
      data: {
        title: 'Jane Eyre',
        updatedAt: new Date()
      }
    });

    console.log('✅ Title updated successfully:', updated.title);
  } catch (error) {
    console.error('❌ Failed to update title:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateTitle();