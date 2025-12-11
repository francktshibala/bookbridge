import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';

config({ path: '.env.local' });

const prisma = new PrismaClient();

async function checkSeed() {
  console.log('🔍 Checking Romantic Love #1 seed status...\n');

  // Check if book exists
  const book = await prisma.featuredBook.findUnique({
    where: { slug: 'romantic-love-1' }
  });

  if (!book) {
    console.log('❌ Book NOT FOUND in database');
    console.log('   Run: npx tsx scripts/seed-romantic-love-1.ts');
    await prisma.$disconnect();
    return;
  }

  console.log('✅ Book FOUND:', book.title);
  console.log(`   ID: ${book.id}`);
  console.log(`   Slug: ${book.slug}`);

  // Check membership
  const modernVoicesCollection = await prisma.bookCollection.findUnique({
    where: { slug: 'modern-voices' }
  });

  if (!modernVoicesCollection) {
    console.log('\n❌ Modern Voices collection NOT FOUND');
    await prisma.$disconnect();
    return;
  }

  console.log(`\n✅ Modern Voices collection FOUND (ID: ${modernVoicesCollection.id})`);

  const membership = await prisma.bookCollectionMembership.findFirst({
    where: {
      bookId: book.id,
      collectionId: modernVoicesCollection.id
    }
  });

  if (!membership) {
    console.log('\n❌ Membership NOT FOUND');
    console.log('   Run: npx tsx scripts/seed-romantic-love-1.ts');
    await prisma.$disconnect();
    return;
  }

  console.log(`\n✅ Membership FOUND`);
  console.log(`   sortOrder: ${membership.sortOrder}`);

  // Check for sortOrder conflicts
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

  console.log(`\n📊 All Modern Voices memberships (${allMemberships.length} total):`);
  const sortOrderCounts: Record<number, string[]> = {};
  allMemberships.forEach(m => {
    if (!sortOrderCounts[m.sortOrder]) {
      sortOrderCounts[m.sortOrder] = [];
    }
    sortOrderCounts[m.sortOrder].push(m.featuredBook.slug);
  });

  const conflicts = Object.entries(sortOrderCounts).filter(([_, books]) => books.length > 1);
  if (conflicts.length > 0) {
    console.log(`\n⚠️  SORTORDER CONFLICTS FOUND:`);
    conflicts.forEach(([sortOrder, books]) => {
      console.log(`   sortOrder ${sortOrder}: ${books.join(', ')}`);
    });
    console.log(`\n   Need to fix sortOrder conflicts - run fix script`);
  } else {
    console.log(`   ✅ No sortOrder conflicts`);
  }

  console.log(`\n📋 Current sortOrder assignments:`);
  allMemberships.slice(0, 20).forEach(m => {
    console.log(`   ${m.sortOrder}: ${m.featuredBook.slug} (${m.featuredBook.title})`);
  });

  await prisma.$disconnect();
}

checkSeed();

