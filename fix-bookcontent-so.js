import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';

config({ path: '.env.local' });
const prisma = new PrismaClient();

async function fixBookContent() {
  console.log('🎄 Fixing "So, Marley" in BookContent table...');

  try {
    const book = await prisma.bookContent.findFirst({
      where: { bookId: 'christmas-carol-enhanced-v2' }
    });

    if (!book) {
      console.log('❌ No BookContent found');
      return;
    }

    console.log('📋 Found BookContent, checking for "So, Marley"...');

    if (book.fullText.includes('So, Marley was dead as a nail')) {
      const fixedText = book.fullText.replace(
        'So, Marley was dead as a nail.',
        'Marley was dead as a nail.'
      );

      await prisma.bookContent.update({
        where: { id: book.id },
        data: { fullText: fixedText }
      });

      console.log('✅ Fixed BookContent table');
      console.log('💡 Now we need to delete and regenerate Bundle 1 again');
    } else {
      console.log('⚠️ "So, Marley" not found in BookContent');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixBookContent();