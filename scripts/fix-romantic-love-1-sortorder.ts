import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';

config({ path: '.env.local' });

const prisma = new PrismaClient();

async function fixSortOrder() {
  console.log('🔧 Fixing sortOrder for Modern Voices collection...\n');

  const modernVoicesCollection = await prisma.bookCollection.findUnique({
    where: { slug: 'modern-voices' }
  });

  if (!modernVoicesCollection) {
    console.log('❌ Modern Voices collection not found');
    await prisma.$disconnect();
    return;
  }

  const allMemberships = await prisma.bookCollectionMembership.findMany({
    where: {
      collectionId: modernVoicesCollection.id
    },
    include: {
      featuredBook: true
    },
    orderBy: {
      sortOrder: 'asc'
    }
  });

  console.log(`Found ${allMemberships.length} memberships\n`);

  // Re-sequence sortOrders starting from 0
  for (let i = 0; i < allMemberships.length; i++) {
    const membership = allMemberships[i];
    await prisma.bookCollectionMembership.update({
      where: {
        bookId_collectionId: {
          bookId: membership.bookId,
          collectionId: membership.collectionId
        }
      },
      data: {
        sortOrder: i
      }
    });
    console.log(`✅ ${i}: ${membership.featuredBook.slug} (${membership.featuredBook.title})`);
  }

  console.log(`\n✅ Fixed all sortOrders (0-${allMemberships.length - 1})`);
  await prisma.$disconnect();
}

fixSortOrder();

