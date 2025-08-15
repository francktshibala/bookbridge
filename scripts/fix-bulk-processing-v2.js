const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

// Configuration
const BOOK_ID = 'gutenberg-514' // Frankenstein
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
    // Test each CEFR level to find the actual chunk count
    const chunkCounts = {}
    for (const level of CEFR_LEVELS) {
      try {
        const response = await fetch(`${BASE_URL}/api/books/${BOOK_ID}/simplify?level=${level}&chunk=999&useAI=false`)
        const data = await response.json()
        if (data.error && data.error.includes('out of range')) {
          // Extract actual chunk count from error message
          const match = data.error.match(/has (\d+) chunks/)
          if (match) {
            chunkCounts[level] = parseInt(match[1])
          }
        }
      } catch (e) {
        console.warn(`Could not determine chunk count for ${level}`)
      }
    }
    
    // Use the minimum chunk count across all levels
    const counts = Object.values(chunkCounts)
    const minChunks = Math.min(...counts)
    console.log('Chunk counts by level:', chunkCounts)
    console.log('Using minimum chunk count:', minChunks)
    return minChunks
  } catch (error) {
    console.error('Failed to get book content:', error)
    throw error
  }
}

async function checkExistingSimplifications(totalChunks) {
  const existing = await prisma.$queryRaw`
    SELECT target_level, chunk_index, quality_score 
    FROM book_simplifications 
    WHERE book_id = ${BOOK_ID}
  `
  
  // Create a map of existing simplifications
  const existingMap = new Set()
  existing.forEach(item => {
    existingMap.add(`${item.target_level}-${item.chunk_index}`)
  })
  
  // Find missing simplifications - FIXED: respect chunk boundaries
  const missing = []
  for (const level of CEFR_LEVELS) {
    for (let chunk = 0; chunk < totalChunks; chunk++) {
      const key = `${level}-${chunk}`
      if (!existingMap.has(key)) {
        missing.push({ level, chunkIndex: chunk })
      }
    }
  }
  
  // Sort by chunk index then level for better processing order
  missing.sort((a, b) => {
    if (a.chunkIndex !== b.chunkIndex) {
      return a.chunkIndex - b.chunkIndex
    }
    return CEFR_LEVELS.indexOf(a.level) - CEFR_LEVELS.indexOf(b.level)
  })
  
  return { existing: existing.length, missing }
}

async function processSimplification(level, chunkIndex, totalChunks, retryCount = 0) {
  try {
    // SAFETY CHECK: Don't process invalid chunks
    if (chunkIndex >= totalChunks) {
      console.log(`    ⚠️ Skipping invalid chunk ${chunkIndex} (max is ${totalChunks - 1})`)
      return { success: false, level, chunkIndex, error: 'Invalid chunk index' }
    }
    
    // CRITICAL: Force cache bypass by adding timestamp
    const timestamp = Date.now()
    // FIXED: Use 'chunk' not 'chunkIndex' in URL!
    const url = `${BASE_URL}/api/books/${BOOK_ID}/simplify?level=${level}&chunk=${chunkIndex}&useAI=true&t=${timestamp}`
    
    console.log(`  Processing: ${level} chunk ${chunkIndex}/${totalChunks - 1}...`)
    
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
        return processSimplification(level, chunkIndex, totalChunks, retryCount + 1)
      }
      return { success: false, level, chunkIndex, error: `HTTP ${response.status}` }
    }
    
    const result = await response.json()
    
    // Check if AI simplification actually worked
    if (result.aiMetadata && result.aiMetadata.quality === 'failed') {
      console.log(`    ⚠️ AI simplification failed (${result.aiMetadata.retryAttempts} attempts)`)
      if (retryCount < MAX_RETRIES) {
        console.log(`    🔄 Retrying (${retryCount + 1}/${MAX_RETRIES})...`)
        await sleep(5000)
        return processSimplification(level, chunkIndex, totalChunks, retryCount + 1)
      }
      return { success: false, level, chunkIndex, error: 'AI simplification failed after retries' }
    }
    
    // Verify it was actually saved to database
    await sleep(1000) // Give database time to commit
    
    const saved = await prisma.$queryRaw`
      SELECT * FROM book_simplifications 
      WHERE book_id = ${BOOK_ID} AND target_level = ${level} AND chunk_index = ${chunkIndex}
      LIMIT 1
    `
    
    if (saved.length > 0) {
      const qualityScore = saved[0].quality_score
      console.log(`    ✅ Verified in database: quality=${qualityScore?.toFixed(3)}`)
      return { success: true, level, chunkIndex, quality: qualityScore }
    } else {
      console.log(`    ⚠️ NOT in database - will retry`)
      if (retryCount < MAX_RETRIES) {
        await sleep(5000)
        return processSimplification(level, chunkIndex, totalChunks, retryCount + 1)
      }
      return { success: false, level, chunkIndex, error: 'Not saved to database' }
    }
    
  } catch (error) {
    if (retryCount < MAX_RETRIES) {
      console.log(`    🔄 Error, retrying (${retryCount + 1}/${MAX_RETRIES})...`)
      await sleep(5000)
      return processSimplification(level, chunkIndex, totalChunks, retryCount + 1)
    }
    return { success: false, level, chunkIndex, error: error.message }
  }
}

async function main() {
  console.log('🚀 FIXED BULK PROCESSING FOR FRANKENSTEIN (v2)')
  console.log('='*60)
  console.log('KEY FIXES:')
  console.log('  1. Respects chunk boundaries (0 to totalChunks-1)')
  console.log('  2. Processing 1 item at a time')
  console.log('  3. 12 second delays (5 requests/minute)')
  console.log('  4. Database verification after each save')
  console.log('')
  
  try {
    // Step 1: Get total chunks
    console.log('📊 Analyzing book structure...')
    const totalChunks = await getBookChunkCount()
    console.log(`  Total chunks: ${totalChunks} (indexed 0-${totalChunks - 1})`)
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
    let consecutiveFailures = 0
    
    for (let i = 0; i < missing.length; i++) {
      const item = missing[i]
      
      console.log(`\n[${i+1}/${missing.length}] Processing ${item.level} chunk ${item.chunkIndex}:`)
      
      const result = await processSimplification(item.level, item.chunkIndex, totalChunks)
      
      if (result.success) {
        totalSuccessful++
        consecutiveFailures = 0 // Reset consecutive failure counter
        console.log(`  ✅ SUCCESS - saved to database`)
      } else {
        totalFailed++
        consecutiveFailures++
        failedItems.push(result)
        console.log(`  ❌ FAILED: ${result.error}`)
      }
      
      // Progress update every 10 items
      if ((i + 1) % 10 === 0 || i === missing.length - 1) {
        const progress = ((i + 1) / missing.length * 100).toFixed(1)
        console.log(`\n📊 Progress: ${progress}% (${totalSuccessful} saved, ${totalFailed} failed)`)
        
        // Verify database count
        const countResult = await prisma.$queryRaw`
          SELECT COUNT(*) as count FROM book_simplifications WHERE book_id = ${BOOK_ID}
        `
        const currentCount = Number(countResult[0].count)
        console.log(`  Database verification: ${currentCount} total entries`)
      }
      
      // Stop if too many consecutive failures
      if (consecutiveFailures >= 5) {
        console.log('\n⚠️ Too many consecutive failures. Check if server is still running.')
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
    
    // Verify actual database count - use raw SQL for consistency
    const finalCountResult = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM book_simplifications WHERE book_id = ${BOOK_ID}
    `
    const finalCount = Number(finalCountResult[0].count)
    const expectedTotal = totalChunks * CEFR_LEVELS.length
    console.log(`\n✅ VERIFIED Database Count: ${finalCount}/${expectedTotal}`)
    
    if (finalCount === expectedTotal) {
      console.log('\n🎉 FRANKENSTEIN FULLY PROCESSED!')
      console.log('All simplifications are saved in the database.')
    } else {
      console.log(`\n⏳ Still missing ${expectedTotal - finalCount} simplifications.`)
      console.log('Run this script again to continue.')
    }
    
    if (failedItems.length > 0) {
      console.log('\n❌ Failed items (first 10):')
      failedItems.slice(0, 10).forEach(item => {
        console.log(`  ${item.level} chunk ${item.chunkIndex}: ${item.error}`)
      })
    }
    
  } catch (error) {
    console.error('\n❌ Fatal error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Check if server is running by testing the actual API endpoint
fetch(`${BASE_URL}/api/books/${BOOK_ID}/content-fast`)
  .then(response => {
    if (response.ok) {
      console.log('✅ Server is running on port 3005')
      console.log('Starting fixed bulk processing v2...\n')
      main()
    } else {
      throw new Error(`Server responded with ${response.status}`)
    }
  })
  .catch((error) => {
    console.error('❌ Server is not running on port 3005 or API is not accessible')
    console.error('Please start the dev server first: PORT=3005 npm run dev')
    console.error('Error:', error.message)
    process.exit(1)
  })