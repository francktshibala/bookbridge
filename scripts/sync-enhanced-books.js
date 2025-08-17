#!/usr/bin/env node

/**
 * Sync Enhanced Books Script
 * 
 * This script automatically detects books with simplifications and marks them as enhanced.
 * Run this after processing new books to add them to the enhanced collection.
 * 
 * Usage: node scripts/sync-enhanced-books.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Default metadata for genres based on book titles/authors
const GENRE_MAPPINGS = {
  'Pride and Prejudice': { genre: 'Romance', cefrLevels: 'B1-C2', estimatedHours: 8 },
  'Romeo and Juliet': { genre: 'Tragedy', cefrLevels: 'B1-C2', estimatedHours: 3 },
  'Alice': { genre: 'Fantasy', cefrLevels: 'A2-C1', estimatedHours: 2.5 },
  'Frankenstein': { genre: 'Gothic', cefrLevels: 'B2-C2', estimatedHours: 6 },
  'Little Women': { genre: 'Coming of Age', cefrLevels: 'A2-B2', estimatedHours: 10 },
  'Christmas Carol': { genre: 'Classic', cefrLevels: 'B1-C1', estimatedHours: 2 },
  'Great Gatsby': { genre: 'American Classic', cefrLevels: 'B2-C2', estimatedHours: 4 },
  'Emma': { genre: 'Romance', cefrLevels: 'B2-C2', estimatedHours: 9 },
  'Treasure Island': { genre: 'Adventure', cefrLevels: 'B1-C1', estimatedHours: 6 },
  'Peter Pan': { genre: 'Fantasy', cefrLevels: 'A2-B2', estimatedHours: 4 },
  'Wizard of Oz': { genre: 'Fantasy', cefrLevels: 'A2-B1', estimatedHours: 3 },
  'Call of the Wild': { genre: 'Adventure', cefrLevels: 'B1-C2', estimatedHours: 3 },
  'Jungle Book': { genre: 'Adventure', cefrLevels: 'A2-B2', estimatedHours: 4 },
  'Moby Dick': { genre: 'Adventure', cefrLevels: 'C1-C2', estimatedHours: 12 },
  'Sherlock Holmes': { genre: 'Mystery', cefrLevels: 'B2-C2', estimatedHours: 8 }
};

async function syncEnhancedBooks() {
  console.log('🔄 Starting enhanced books sync...\n');

  try {
    // 1. Get all books from BookContent table
    const books = await prisma.bookContent.findMany({
      include: {
        simplifications: {
          select: {
            id: true,
            level: true
          }
        }
      }
    });

    console.log(`📚 Found ${books.length} books in database\n`);

    // 2. Check which books have simplifications
    const enhancedBooks = [];
    const pendingBooks = [];

    for (const book of books) {
      const simplificationCount = book.simplifications.length;
      const levels = [...new Set(book.simplifications.map(s => s.level))].sort();
      
      // Find matching metadata
      let metadata = null;
      for (const [keyword, data] of Object.entries(GENRE_MAPPINGS)) {
        if (book.title.includes(keyword)) {
          metadata = data;
          break;
        }
      }

      if (simplificationCount > 0) {
        enhancedBooks.push({
          id: book.bookId,
          title: book.title,
          author: book.author,
          simplificationCount,
          levels: levels.join(', '),
          metadata: metadata || { genre: 'Classic', cefrLevels: 'B1-C2', estimatedHours: 5 }
        });
      } else {
        pendingBooks.push({
          id: book.bookId,
          title: book.title,
          author: book.author
        });
      }
    }

    // 3. Display results
    console.log('✅ ENHANCED BOOKS (with simplifications):');
    console.log('=========================================\n');
    
    enhancedBooks.forEach(book => {
      console.log(`📖 ${book.title}`);
      console.log(`   Author: ${book.author}`);
      console.log(`   ID: ${book.id}`);
      console.log(`   Simplifications: ${book.simplificationCount} (Levels: ${book.levels})`);
      console.log(`   Genre: ${book.metadata.genre}`);
      console.log(`   CEFR Range: ${book.metadata.cefrLevels}`);
      console.log(`   Est. Hours: ${book.metadata.estimatedHours}`);
      console.log('');
    });

    console.log('\n⏳ PENDING BOOKS (no simplifications yet):');
    console.log('==========================================\n');
    
    pendingBooks.forEach(book => {
      console.log(`📕 ${book.title} by ${book.author}`);
      console.log(`   ID: ${book.id}`);
      console.log('');
    });

    // 4. Generate enhanced book IDs array for the collection page
    console.log('\n📋 Enhanced Book IDs for collection page:');
    console.log('=========================================');
    console.log('const ENHANCED_BOOK_IDS = [');
    enhancedBooks.forEach(book => {
      console.log(`  '${book.id}', // ${book.title}`);
    });
    console.log('];\n');

    // 5. Summary
    console.log('📊 SUMMARY:');
    console.log(`   Total books: ${books.length}`);
    console.log(`   Enhanced (with simplifications): ${enhancedBooks.length}`);
    console.log(`   Pending (no simplifications): ${pendingBooks.length}\n`);

    // 6. Optional: Update a JSON file with enhanced books
    const fs = require('fs').promises;
    const enhancedBooksData = {
      lastUpdated: new Date().toISOString(),
      books: enhancedBooks.map(book => ({
        id: book.id,
        title: book.title,
        author: book.author,
        ...book.metadata,
        simplificationCount: book.simplificationCount
      }))
    };

    await fs.writeFile(
      './enhanced-books.json',
      JSON.stringify(enhancedBooksData, null, 2)
    );
    console.log('✅ Saved enhanced books to enhanced-books.json\n');

  } catch (error) {
    console.error('❌ Error syncing enhanced books:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the sync
syncEnhancedBooks();