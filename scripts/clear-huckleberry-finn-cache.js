const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log('🧹 CLEARING HUCKLEBERRY FINN CACHE')
  console.log('====================================')
  
  try {
    // Delete ALL Huckleberry Finn entries - force fresh start
    const result = await prisma.bookSimplification.deleteMany({
      where: {
        bookId: 'gutenberg-76'
      }
    })
    
    console.log(`✅ Deleted ${result.count} Huckleberry Finn simplifications`)
    console.log('   Ready for fresh AI processing')
    
  } catch (error) {
    console.error('❌ Error clearing cache:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main().catch(console.error)