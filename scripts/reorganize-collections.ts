/**
 * Collection Reorganization Script
 * 
 * Purpose: Reorganize collections to honor classic literature origin
 * - Consolidate all classic books into Classic Literature (sortOrder=0)
 * - Create 5 new modern collections
 * - Reassign Modern Voices stories to new collections
 * - Archive old collections
 * 
 * Reference: docs/implementation/COLLECTION_REORGANIZATION_PLAN.md
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

// Story to collection mapping
const storyMapping = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'cache', 'story-collection-mapping.json'), 'utf-8')
);

async function reorganizeCollections() {
  console.log('🔄 Starting collection reorganization...\n');

  try {
    // Step 1: Consolidate classic books into Classic Literature
    console.log('📚 Step 1: Consolidating classic books...');
    const classicCollection = await prisma.bookCollection.findUnique({
      where: { slug: 'classics' },
      include: { books: { include: { featuredBook: true } } }
    });

    if (!classicCollection) {
      throw new Error('Classic Literature collection not found');
    }

    const classicSourceCollections = await prisma.bookCollection.findMany({
      where: {
        slug: { in: ['classics', 'quick-reads', 'romance', 'psychological', 'gothic-horror'] }
      },
      include: { books: { include: { featuredBook: true } } }
    });

    const allClassicBookIds = new Set<string>();
    classicSourceCollections.forEach(collection => {
      collection.books.forEach(membership => {
        allClassicBookIds.add(membership.featuredBook.id);
      });
    });

    console.log(`   Found ${allClassicBookIds.size} unique classic books`);

    // Ensure all classic books are in Classic Literature collection
    let sortOrder = 0;
    for (const bookId of Array.from(allClassicBookIds)) {
      const existing = await prisma.bookCollectionMembership.findUnique({
        where: {
          bookId_collectionId: {
            bookId,
            collectionId: classicCollection.id
          }
        }
      });

      if (!existing) {
        await prisma.bookCollectionMembership.create({
          data: {
            bookId,
            collectionId: classicCollection.id,
            sortOrder: sortOrder++
          }
        });
        console.log(`   ✓ Added book ${bookId} to Classic Literature`);
      }
    }

    // Step 2: Update Classic Literature position (sortOrder=0, isPrimary=true)
    await prisma.bookCollection.update({
      where: { slug: 'classics' },
      data: {
        isPrimary: true,
        sortOrder: 0
      }
    });
    console.log('   ✓ Classic Literature set to sortOrder=0 (first position)\n');

    // Step 3: Create 5 new modern collections
    console.log('✨ Step 2: Creating new modern collections...');
    const newCollections = [
      {
        slug: 'starting-over',
        name: 'Starting Over',
        description: 'Stories of fresh starts, rebuilding, and hope for new beginnings',
        icon: '🌱',
        sortOrder: 1
      },
      {
        slug: 'breaking-barriers',
        name: 'Breaking Barriers',
        description: 'Overcoming obstacles, proving doubters wrong, and resilience',
        icon: '💪',
        sortOrder: 2
      },
      {
        slug: 'finding-home',
        name: 'Finding Home',
        description: 'Belonging, connection, identity, and building community',
        icon: '🏠',
        sortOrder: 3
      },
      {
        slug: 'building-dreams',
        name: 'Building Dreams',
        description: 'Following passion, professional transformation, and achieving goals',
        icon: '🌟',
        sortOrder: 4
      },
      {
        slug: 'making-a-difference',
        name: 'Making a Difference',
        description: 'Impact, purpose, legacy, and helping others',
        icon: '💫',
        sortOrder: 5
      }
    ];

    const createdCollections: Record<string, string> = {};
    for (const collectionData of newCollections) {
      const existing = await prisma.bookCollection.findUnique({
        where: { slug: collectionData.slug }
      });

      if (existing) {
        // Update existing collection
        await prisma.bookCollection.update({
          where: { slug: collectionData.slug },
          data: {
            name: collectionData.name,
            description: collectionData.description,
            icon: collectionData.icon,
            isPrimary: true,
            sortOrder: collectionData.sortOrder,
            type: 'theme'
          }
        });
        createdCollections[collectionData.slug] = existing.id;
        console.log(`   ✓ Updated collection: ${collectionData.name}`);
      } else {
        // Create new collection
        const created = await prisma.bookCollection.create({
          data: {
            slug: collectionData.slug,
            name: collectionData.name,
            description: collectionData.description,
            icon: collectionData.icon,
            isPrimary: true,
            sortOrder: collectionData.sortOrder,
            type: 'theme'
          }
        });
        createdCollections[collectionData.slug] = created.id;
        console.log(`   ✓ Created collection: ${collectionData.name}`);
      }
    }
    console.log('');

    // Step 4: Reassign Modern Voices stories to new collections
    console.log('🔄 Step 3: Reassigning Modern Voices stories...');
    const modernVoicesCollection = await prisma.bookCollection.findUnique({
      where: { slug: 'modern-voices' },
      include: { books: { include: { featuredBook: true } } }
    });

    if (!modernVoicesCollection) {
      throw new Error('Modern Voices collection not found');
    }

    // Get all featured books by slug for quick lookup
    const allStorySlugs = Object.values(storyMapping).flat() as string[];
    const allFeaturedBooks = await prisma.featuredBook.findMany({
      where: {
        slug: { in: allStorySlugs }
      }
    });

    const bookSlugToId = new Map<string, string>();
    allFeaturedBooks.forEach(book => {
      bookSlugToId.set(book.slug, book.id);
    });

    // Assign stories to new collections
    for (const [collectionSlug, storySlugs] of Object.entries(storyMapping)) {
      const collectionId = createdCollections[collectionSlug];
      if (!collectionId) {
        console.warn(`   ⚠️  Collection ${collectionSlug} not found, skipping...`);
        continue;
      }

      let sortOrder = 0;
      for (const storySlug of storySlugs as string[]) {
        const bookId = bookSlugToId.get(storySlug);
        if (!bookId) {
          console.warn(`   ⚠️  Book ${storySlug} not found, skipping...`);
          continue;
        }

        // Check if membership already exists
        const existing = await prisma.bookCollectionMembership.findUnique({
          where: {
            bookId_collectionId: {
              bookId,
              collectionId
            }
          }
        });

        if (!existing) {
          await prisma.bookCollectionMembership.create({
            data: {
              bookId,
              collectionId,
              sortOrder: sortOrder++
            }
          });
          console.log(`   ✓ Assigned ${storySlug} to ${collectionSlug}`);
        } else {
          // Update sortOrder if needed
          await prisma.bookCollectionMembership.update({
            where: {
              bookId_collectionId: {
                bookId,
                collectionId
              }
            },
            data: { sortOrder: sortOrder++ }
          });
          console.log(`   ✓ Updated ${storySlug} in ${collectionSlug}`);
        }
      }
    }
    console.log('');

    // Step 5: Archive old collections (set isPrimary=false, sortOrder high)
    console.log('📦 Step 4: Archiving old collections...');
    const oldCollections = ['quick-reads', 'romance', 'psychological', 'gothic-horror'];
    
    for (const slug of oldCollections) {
      await prisma.bookCollection.updateMany({
        where: { slug },
        data: { 
          isPrimary: false,
          sortOrder: 100 // High sortOrder to push to bottom
        }
      });
      console.log(`   ✓ Archived: ${slug}`);
    }

    // Archive Modern Voices (keep for reference but not primary)
    await prisma.bookCollection.update({
      where: { slug: 'modern-voices' },
      data: {
        isPrimary: false,
        sortOrder: 100
      }
    });
    console.log('   ✓ Archived: modern-voices\n');

    // Step 6: Verification
    console.log('✅ Step 5: Verification...');
    const finalCollections = await prisma.bookCollection.findMany({
      where: { isPrimary: true },
      orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }],
      include: {
        _count: { select: { books: true } }
      }
    });

    console.log('\n📊 Final Collection Structure:');
    finalCollections.forEach(c => {
      console.log(`   ${c.sortOrder}. ${c.name} (${c.slug}): ${c._count.books} books, isPrimary=${c.isPrimary}`);
    });

    console.log('\n✅ Collection reorganization complete!');
    console.log(`   Total active collections: ${finalCollections.length}`);
    console.log(`   Classic Literature books: ${finalCollections.find(c => c.slug === 'classics')?._count.books || 0}`);

  } catch (error) {
    console.error('❌ Error during reorganization:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
if (require.main === module) {
  reorganizeCollections().catch(console.error);
}

export { reorganizeCollections };

