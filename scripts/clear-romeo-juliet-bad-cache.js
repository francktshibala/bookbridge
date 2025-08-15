const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function clearRomeoJulietBadCache() {
  console.log('🧹 CLEARING ROMEO & JULIET FAILED SIMPLIFICATIONS')
  console.log('='*50)
  console.log('Book ID: gutenberg-1513')
  console.log('Issue: Script incorrectly reported success but text is identical')
  
  try {
    // Check current count
    const currentCount = await prisma.bookSimplification.count({
      where: { bookId: 'gutenberg-1513' }
    })
    
    console.log(`\nCurrent simplifications in database: ${currentCount}`)
    
    if (currentCount === 0) {
      console.log('✅ No simplifications found - already clean')
      await prisma.$disconnect()
      return
    }
    
    // Sample to confirm they're bad
    const samples = await prisma.bookSimplification.findMany({
      where: { bookId: 'gutenberg-1513' },
      select: {
        targetLevel: true,
        chunkIndex: true,
        originalText: true,
        simplifiedText: true,
        qualityScore: true
      },
      take: 5
    })
    
    console.log('\n📝 Sample simplifications to verify issue:')
    let identicalCount = 0
    samples.forEach(sample => {
      const isIdentical = sample.originalText === sample.simplifiedText
      if (isIdentical) identicalCount++
      const preview = sample.originalText.substring(0, 50)
      console.log(`  ${sample.targetLevel} chunk ${sample.chunkIndex}: ${isIdentical ? '❌ IDENTICAL' : '✅ Different'} (quality: ${sample.qualityScore})`)
      if (isIdentical) {
        console.log(`    Preview: "${preview}..."`)
      }
    })
    
    if (identicalCount === samples.length) {
      console.log('\n❌ CONFIRMED: All samples show identical text - simplification failed!')
    }
    
    // Delete all Romeo & Juliet simplifications
    console.log(`\n🗑️  Deleting ${currentCount} failed simplifications...`)
    const deleted = await prisma.bookSimplification.deleteMany({
      where: { bookId: 'gutenberg-1513' }
    })
    
    console.log(`✅ Successfully deleted ${deleted.count} Romeo & Juliet simplifications`)
    console.log('\n🎯 Next steps:')
    console.log('1. Fix the validation logic in bulk-process-romeo-juliet.js')
    console.log('2. The script needs to check if originalText === simplifiedText')
    console.log('3. Reset usage limits: node scripts/reset-usage-limits.js')
    console.log('4. Rerun with fixed validation')
    
  } catch (error) {
    console.error('❌ Error clearing Romeo & Juliet cache:', error)
  } finally {
    await prisma.$disconnect()
  }
}

clearRomeoJulietBadCache()