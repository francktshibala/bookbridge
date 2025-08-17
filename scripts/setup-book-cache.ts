import { prisma } from '../lib/prisma'

async function setupBookCache() {
  try {
    // Try to create the book_cache table if it doesn't exist
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS book_cache (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        "bookId" TEXT UNIQUE NOT NULL,
        chunks JSONB NOT NULL,
        "totalChunks" INTEGER NOT NULL,
        metadata JSONB NOT NULL,
        "lastProcessed" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        indexed BOOLEAN NOT NULL DEFAULT false,
        FOREIGN KEY ("bookId") REFERENCES books(id) ON DELETE CASCADE
      );
    `
    
    console.log('✅ book_cache table setup completed')
    
    // Check if any books need processing
    const booksNeedingProcessing = await prisma.book.count({
      where: {
        filename: { not: null },
        bookCache: null
      }
    })
    
    console.log(`📚 Found ${booksNeedingProcessing} books that need processing`)
    
    if (booksNeedingProcessing > 0) {
      console.log('💡 Run the following to process all books:')
      console.log('POST /api/admin/process-books with {"action": "process-all"}')
    }
    
  } catch (error) {
    console.error('❌ Error setting up book cache:', error)
  } finally {
    await prisma.$disconnect()
  }
}

setupBookCache()