const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function clearLittleWomenCache() {
  console.log('🧹 CLEARING LITTLE WOMEN FAILED SIMPLIFICATIONS')
  console.log('='*50)
  console.log('Book ID: gutenberg-514')
  console.log('Reason: Usage limit caused identical text caching')
  
  try {
    // Check current count
    const currentCount = await prisma.bookSimplification.count({
      where: { bookId: 'gutenberg-514' }
    })
    
    console.log(`\nCurrent simplifications in database: ${currentCount}`)
    
    if (currentCount === 0) {
      console.log('✅ No simplifications found - already clean')
      await prisma.$disconnect()
      return
    }
    
    // Sample a few to confirm they're bad
    const samples = await prisma.bookSimplification.findMany({
      where: { bookId: 'gutenberg-514' },
      select: {
        targetLevel: true,
        chunkIndex: true,
        originalText: true,
        simplifiedText: true,
        qualityScore: true
      },
      take: 3
    })
    
    console.log('\n📝 Sample simplifications to be deleted:')
    samples.forEach(sample => {
      const isIdentical = sample.originalText === sample.simplifiedText
      console.log(`  ${sample.targetLevel} chunk ${sample.chunkIndex}: ${isIdentical ? '❌ IDENTICAL' : '✅ Different'} (quality: ${sample.qualityScore})`)
    })
    
    // Delete all Little Women simplifications
    console.log(`\n🗑️  Deleting ${currentCount} simplifications...`)
    const deleted = await prisma.bookSimplification.deleteMany({
      where: { bookId: 'gutenberg-514' }
    })
    
    console.log(`✅ Successfully deleted ${deleted.count} Little Women simplifications`)
    console.log('\n🎯 Next steps:')
    console.log('1. Ensure usage limits are reset: node scripts/reset-usage-limits.js')
    console.log('2. Create bulk processing script for Little Women')
    console.log('3. Process with quality validation')
    
  } catch (error) {
    console.error('❌ Error clearing Little Women cache:', error)
  } finally {
    await prisma.$disconnect()
  }
}

clearLittleWomenCache()