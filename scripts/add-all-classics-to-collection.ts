/**
 * Add All Classic Books to Classic Literature Collection
 * 
 * Sources:
 * 1. Enhanced Books Grid (components/ui/EnhancedBooksGrid.tsx)
 * 2. Enhanced Books API (app/api/books/enhanced/route.ts)
 * 3. Featured Books (already in database with isClassic=true)
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Enhanced books from EnhancedBooksGrid.tsx
const ENHANCED_BOOKS = [
  { slug: 'gutenberg-1342', title: 'Pride and Prejudice', author: 'Jane Austen' },
  { slug: 'gutenberg-1513', title: 'Romeo and Juliet', author: 'William Shakespeare' },
  { slug: 'gutenberg-84', title: 'Frankenstein', author: 'Mary Shelley' },
  { slug: 'gutenberg-11', title: 'Alice in Wonderland', author: 'Lewis Carroll' },
  { slug: 'gutenberg-64317', title: 'The Great Gatsby', author: 'F. Scott Fitzgerald' }, // Already exists
  { slug: 'gutenberg-43', title: 'Dr. Jekyll and Mr. Hyde', author: 'Robert Louis Stevenson' }, // Already exists
  { slug: 'gutenberg-1952', title: 'The Yellow Wallpaper', author: 'Charlotte Perkins Gilman' }, // Already exists (as gutenberg-1952-A1)
];

// Additional classics from Enhanced API route
const ADDITIONAL_CLASSICS = [
  { slug: 'gutenberg-158', title: 'Emma', author: 'Jane Austen' },
  { slug: 'gutenberg-215', title: 'The Call of the Wild', author: 'Jack London' },
  { slug: 'gutenberg-844', title: 'The Importance of Being Earnest', author: 'Oscar Wilde' },
  { slug: 'gutenberg-174', title: 'The Picture of Dorian Gray', author: 'Oscar Wilde' },
  { slug: 'gutenberg-345', title: 'Dracula', author: 'Bram Stoker' },
  { slug: 'gutenberg-76', title: 'Adventures of Huckleberry Finn', author: 'Mark Twain' },
  { slug: 'gutenberg-74', title: 'The Adventures of Tom Sawyer', author: 'Mark Twain' },
];

// Map gutenberg IDs to existing FeaturedBook slugs
const SLUG_MAPPING: Record<string, string> = {
  'gutenberg-64317': 'great-gatsby-a2', // The Great Gatsby
  'gutenberg-43': 'gutenberg-43', // Dr. Jekyll and Mr. Hyde
  'gutenberg-1952': 'gutenberg-1952-A1', // The Yellow Wallpaper
};

async function addAllClassicsToCollection() {
  console.log('📚 Adding all classic books to Classic Literature collection...\n');

  // Get Classic Literature collection
  const classicCollection = await prisma.bookCollection.findUnique({
    where: { slug: 'classics' }
  });

  if (!classicCollection) {
    throw new Error('Classic Literature collection not found');
  }

  // Get current memberships
  const currentMemberships = await prisma.bookCollectionMembership.findMany({
    where: { collectionId: classicCollection.id },
    include: { featuredBook: true }
  });

  const existingBookIds = new Set(currentMemberships.map(m => m.featuredBook.id));
  const existingSlugs = new Set(currentMemberships.map(m => m.featuredBook.slug));

  console.log(`Current books in collection: ${existingBookIds.size}`);

  // Combine all classic books
  const allClassics = [...ENHANCED_BOOKS, ...ADDITIONAL_CLASSICS];

  let addedCount = 0;
  let skippedCount = 0;
  let createdCount = 0;

  // Get max sortOrder
  const maxSortOrder = currentMemberships.length > 0
    ? Math.max(...currentMemberships.map(m => m.sortOrder))
    : -1;

  let nextSortOrder = maxSortOrder + 1;

  for (const classic of allClassics) {
    // Check if mapped to existing slug
    const mappedSlug = SLUG_MAPPING[classic.slug] || classic.slug;

    // Try to find existing FeaturedBook
    let book = await prisma.featuredBook.findUnique({
      where: { slug: mappedSlug }
    });

    // If not found, try original slug
    if (!book) {
      book = await prisma.featuredBook.findUnique({
        where: { slug: classic.slug }
      });
    }

    // If still not found, create a basic FeaturedBook record
    if (!book) {
      console.log(`  ⚠️  Book not found: ${classic.title} (${classic.slug})`);
      console.log(`     Creating basic FeaturedBook record...`);

      book = await prisma.featuredBook.create({
        data: {
          slug: classic.slug,
          title: classic.title,
          author: classic.author,
          description: `Classic literature: ${classic.title} by ${classic.author}`,
          sentences: 0, // Will be updated when content is added
          bundles: 0,
          gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          abbreviation: classic.title.substring(0, 2).toUpperCase(),
          genres: ['Classic Literature'],
          themes: [],
          moods: [],
          readingTimeMinutes: 0,
          difficultyScore: 0.5,
          popularityScore: 50,
          isClassic: true,
          isFeatured: false, // Not featured until content is ready
          isNew: false
        }
      });
      createdCount++;
      console.log(`     ✅ Created: ${book.title}`);
    }

    // Check if already in collection
    if (existingBookIds.has(book.id)) {
      console.log(`  ⏭️  Skipped (already in collection): ${book.title}`);
      skippedCount++;
      continue;
    }

    // Add to collection
    await prisma.bookCollectionMembership.create({
      data: {
        bookId: book.id,
        collectionId: classicCollection.id,
        sortOrder: nextSortOrder++
      }
    });

    // Mark as classic if not already
    if (!book.isClassic) {
      await prisma.featuredBook.update({
        where: { id: book.id },
        data: { isClassic: true }
      });
      console.log(`  ✅ Marked as classic: ${book.title}`);
    }

    console.log(`  ✅ Added to collection: ${book.title} (sortOrder: ${nextSortOrder - 1})`);
    addedCount++;
  }

  // Verify final count
  const finalCount = await prisma.bookCollectionMembership.count({
    where: { collectionId: classicCollection.id }
  });

  console.log(`\n✅ Summary:`);
  console.log(`   - Added: ${addedCount} books`);
  console.log(`   - Created: ${createdCount} new FeaturedBook records`);
  console.log(`   - Skipped: ${skippedCount} (already in collection)`);
  console.log(`   - Total books in Classic Literature: ${finalCount}`);
}

if (require.main === module) {
  addAllClassicsToCollection()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
}

export { addAllClassicsToCollection };

