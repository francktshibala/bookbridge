/**
 * Validation Script: Collection Limits Check
 * 
 * Ensures collections don't exceed frontend/API limits
 * Run this after adding books to collections to prevent pagination issues
 * 
 * See: docs/MODERN_VOICES_IMPLEMENTATION_GUIDE.md Mistake #7
 */

import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';

config({ path: '.env.local' });

const prisma = new PrismaClient();

const FRONTEND_COLLECTION_LIMIT = 50; // Must match lib/services/book-catalog.ts
const API_COLLECTION_LIMIT = 50; // Must match app/api/featured-books/route.ts

async function validateCollectionLimits() {
  console.log('🔍 Validating collection limits...\n');

  const collections = await prisma.bookCollection.findMany({
    include: {
      _count: {
        select: { books: true }
      }
    }
  });

  let hasIssues = false;

  for (const collection of collections) {
    const bookCount = collection._count.books;
    
    if (bookCount > FRONTEND_COLLECTION_LIMIT) {
      console.error(`❌ ${collection.name} (${collection.slug}):`);
      console.error(`   Has ${bookCount} books, but frontend limit is ${FRONTEND_COLLECTION_LIMIT}`);
      console.error(`   Books beyond position ${FRONTEND_COLLECTION_LIMIT} will not appear!\n`);
      hasIssues = true;
    } else if (bookCount > FRONTEND_COLLECTION_LIMIT * 0.8) {
      console.warn(`⚠️  ${collection.name} (${collection.slug}):`);
      console.warn(`   Has ${bookCount} books (${Math.round((bookCount / FRONTEND_COLLECTION_LIMIT) * 100)}% of limit)`);
      console.warn(`   Consider increasing limit or splitting into multiple collections\n`);
    } else {
      console.log(`✅ ${collection.name} (${collection.slug}): ${bookCount} books`);
    }
  }

  if (hasIssues) {
    console.error('\n❌ VALIDATION FAILED: Some collections exceed limits!');
    console.error('Fix: Increase FRONTEND_COLLECTION_LIMIT and API_COLLECTION_LIMIT in this script');
    console.error('Or: Split large collections into multiple smaller collections');
    process.exit(1);
  } else {
    console.log('\n✅ All collections are within limits');
  }
}

validateCollectionLimits()
  .catch((error) => {
    console.error('Error validating collections:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

