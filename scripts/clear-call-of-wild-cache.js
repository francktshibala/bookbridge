const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log('🧹 CLEARING CALL OF THE WILD CACHE')
  console.log('====================================')
  
  try {
    // Delete ALL Call of the Wild entries - force fresh start
    const result = await prisma.bookSimplification.deleteMany({
      where: {
        bookId: 'gutenberg-215'
      }
    })
    
    console.log(`✅ Deleted ${result.count} Call of the Wild simplifications`)
    console.log('   Ready for fresh AI processing')
    
  } catch (error) {
    console.error('❌ Error clearing cache:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main().catch(console.error)