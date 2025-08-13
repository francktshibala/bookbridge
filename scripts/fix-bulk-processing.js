const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

// Configuration
const BOOK_ID = 'gutenberg-1342' // Pride & Prejudice
const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']
const BASE_URL = 'http://localhost:3005'
const BATCH_SIZE = 1 // Process only 1 at a time to avoid database issues
const DELAY_BETWEEN_REQUESTS = 12000 // 12 seconds between requests (5 per minute to stay under rate limits)
const MAX_RETRIES = 2

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function getBookChunkCount() {
  try {
    const response = await fetch(`${BASE_URL}/api/books/${BOOK_ID}/content-fast`)
    const data = await response.json()
    const fullText = data.context || data.content
    const words = fullText.split(/\s+/)
    const totalChunks = Math.ceil(words.length / 400)
    return totalChunks
  } catch (error) {
    console.error('Failed to get book content:', error)
    throw error
  }
}

async function checkExistingSimplifications(totalChunks) {
  const existing = await prisma.bookSimplification.findMany({
    where: {
      bookId: BOOK_ID
    },
    select: {
      targetLevel: true,
      chunkIndex: true,
      qualityScore: true
    }
  })
  
  // Create a map of existing simplifications
  const existingMap = new Set()
  existing.forEach(item => {
    existingMap.add(`${item.targetLevel}-${item.chunkIndex}`)
  })
  
  // Find missing simplifications
  const missing = []
  for (const level of CEFR_LEVELS) {
    for (let chunk = 0; chunk < totalChunks; chunk++) {
      const key = `${level}-${chunk}`
      if (!existingMap.has(key)) {
        missing.push({ level, chunkIndex: chunk })
      }
    }
  }
  
  return { existing: existing.length, missing }
}

async function processSimplification(level, chunkIndex, retryCount = 0) {
  try {
    // CRITICAL: Force cache bypass by adding timestamp
    const timestamp = Date.now()
    // FIXED: Use 'chunk' not 'chunkIndex' in URL!
    const url = `${BASE_URL}/api/books/${BOOK_ID}/simplify?level=${level}&chunk=${chunkIndex}&useAI=true&t=${timestamp}`
    
    console.log(`  Processing: ${level} chunk ${chunkIndex}...`)
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache' // Force no caching
      },
      timeout: 60000 // 60 second timeout
    })
    
    if (!response.ok) {
      if (retryCount < MAX_RETRIES) {
        console.log(`    🔄 Retrying (${retryCount + 1}/${MAX_RETRIES})...`)
        await sleep(5000)
        return processSimplification(level, chunkIndex, retryCount + 1)
      }
      return { success: false, level, chunkIndex, error: `HTTP ${response.status}` }
    }
    
    const result = await response.json()
    
    // Verify it was actually saved to database
    await sleep(1000) // Give database time to commit
    
    const saved = await prisma.bookSimplification.findUnique({
      where: {
        bookId_targetLevel_chunkIndex: {
          bookId: BOOK_ID,
          targetLevel: level,
          chunkIndex: chunkIndex
        }
      }
    })
    
    if (saved) {
      console.log(`    ✅ Verified in database: quality=${saved.qualityScore?.toFixed(3)}`)
      return { success: true, level, chunkIndex, quality: saved.qualityScore }
    } else {
      console.log(`    ⚠️ NOT in database - will retry`)
      if (retryCount < MAX_RETRIES) {
        await sleep(5000)
        return processSimplification(level, chunkIndex, retryCount + 1)
      }
      return { success: false, level, chunkIndex, error: 'Not saved to database' }
    }
    
  } catch (error) {
    if (retryCount < MAX_RETRIES) {
      console.log(`    🔄 Error, retrying (${retryCount + 1}/${MAX_RETRIES})...`)
      await sleep(5000)
      return processSimplification(level, chunkIndex, retryCount + 1)
    }
    return { success: false, level, chunkIndex, error: error.message }
  }
}

async function main() {
  console.log('🚀 FIXED BULK PROCESSING FOR PRIDE & PREJUDICE')
  console.log('='*60)
  console.log('KEY FIXES:')
  console.log('  1. Processing 1 item at a time (no batching)')
  console.log('  2. 12 second delays (5 requests/minute)')
  console.log('  3. Database verification after each save')
  console.log('  4. Cache bypass with timestamp')
  console.log('')
  
  try {
    // Step 1: Get total chunks
    console.log('📊 Analyzing book structure...')
    const totalChunks = await getBookChunkCount()
    console.log(`  Total chunks: ${totalChunks}`)
    console.log(`  CEFR levels: ${CEFR_LEVELS.join(', ')}`)
    console.log(`  Maximum possible simplifications: ${totalChunks * CEFR_LEVELS.length}`)
    
    // Step 2: Check existing simplifications
    console.log('\n🔍 Checking existing simplifications...')
    const { existing, missing } = await checkExistingSimplifications(totalChunks)
    console.log(`  Already SAVED in database: ${existing}`)
    console.log(`  Missing: ${missing.length}`)
    
    if (missing.length === 0) {
      console.log('\n✅ All simplifications already complete!')
      await prisma.$disconnect()
      return
    }
    
    // Group missing by level for visibility
    const byLevel = {}
    CEFR_LEVELS.forEach(level => {
      byLevel[level] = missing.filter(m => m.level === level).length
    })
    console.log('\n📊 Missing by level:')
    Object.entries(byLevel).forEach(([level, count]) => {
      console.log(`  ${level}: ${count}`)
    })
    
    // Calculate time estimate
    const estimatedMinutes = Math.ceil((missing.length * DELAY_BETWEEN_REQUESTS) / 60000)
    const estimatedHours = Math.ceil(estimatedMinutes / 60)
    console.log(`\n⏱️ Estimated time: ${estimatedHours} hours (${estimatedMinutes} minutes)`)
    console.log('  Processing rate: 5 per minute (to avoid rate limits)')
    
    // Step 3: Process one by one with database verification
    console.log('\n📝 Processing missing simplifications ONE BY ONE...')
    
    let totalSuccessful = 0
    let totalFailed = 0
    const failedItems = []
    
    for (let i = 0; i < missing.length; i++) {
      const item = missing[i]
      
      console.log(`\n[${i+1}/${missing.length}] Processing ${item.level} chunk ${item.chunkIndex}:`)
      
      const result = await processSimplification(item.level, item.chunkIndex)
      
      if (result.success) {
        totalSuccessful++
        console.log(`  ✅ SUCCESS - saved to database`)
      } else {
        totalFailed++
        failedItems.push(result)
        console.log(`  ❌ FAILED: ${result.error}`)
      }
      
      // Progress update every 10 items
      if ((i + 1) % 10 === 0 || i === missing.length - 1) {
        const progress = ((i + 1) / missing.length * 100).toFixed(1)
        console.log(`\n📊 Progress: ${progress}% (${totalSuccessful} saved, ${totalFailed} failed)`)
        
        // Verify database count
        const currentCount = await prisma.bookSimplification.count({
          where: { bookId: BOOK_ID }
        })
        console.log(`  Database verification: ${currentCount} total entries`)
      }
      
      // Stop if too many failures
      if (totalFailed > 10) {
        console.log('\n⚠️ Too many failures. Stopping to prevent issues.')
        break
      }
      
      // Wait before next request
      if (i < missing.length - 1) {
        console.log(`  Waiting ${DELAY_BETWEEN_REQUESTS/1000}s before next request...`)
        await sleep(DELAY_BETWEEN_REQUESTS)
      }
    }
    
    // Step 4: Final verification
    console.log('\n' + '='*60)
    console.log('📊 FINAL SUMMARY:')
    console.log(`  Attempted: ${totalSuccessful + totalFailed}`)
    console.log(`  Successfully saved: ${totalSuccessful}`)
    console.log(`  Failed: ${totalFailed}`)
    
    // Verify actual database count
    const finalCount = await prisma.bookSimplification.count({
      where: { bookId: BOOK_ID }
    })
    console.log(`\n✅ VERIFIED Database Count: ${finalCount}/1830`)
    
    if (finalCount === 1830) {
      console.log('\n🎉 PRIDE & PREJUDICE FULLY PROCESSED!')
      console.log('All simplifications are saved in the database.')
    } else {
      console.log(`\n⏳ Still missing ${1830 - finalCount} simplifications.`)
      console.log('Run this script again to continue.')
    }
    
    if (failedItems.length > 0) {
      console.log('\n❌ Failed items:')
      failedItems.slice(0, 5).forEach(item => {
        console.log(`  ${item.level} chunk ${item.chunkIndex}: ${item.error}`)
      })
    }
    
  } catch (error) {
    console.error('\n❌ Fatal error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Check if server is running
fetch(`${BASE_URL}/api/health`)
  .then(() => {
    console.log('✅ Server is running on port 3005')
    console.log('Starting fixed bulk processing...\n')
    main()
  })
  .catch(() => {
    console.error('❌ Server is not running on port 3005')
    console.error('Please start the dev server first: npm run dev')
    process.exit(1)
  })