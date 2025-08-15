const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

// Configuration
const BOOK_ID = 'gutenberg-1342' // Pride & Prejudice
const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']
const BASE_URL = 'http://localhost:3004'
const BATCH_SIZE = 3 // Reduced for stability
const DELAY_BETWEEN_BATCHES = 5000 // 5 seconds between batches
const MAX_RETRIES = 2
const DELAY_BETWEEN_REQUESTS = 500 // 0.5s between individual requests

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
      chunkIndex: true
    }
  })
  
  const existingMap = new Set()
  existing.forEach(item => {
    existingMap.add(`${item.targetLevel}-${item.chunkIndex}`)
  })
  
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
    const url = `${BASE_URL}/api/books/${BOOK_ID}/simplify?level=${level}&chunkIndex=${chunkIndex}&useAI=true`
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 30000 // 30 second timeout
    })
    
    if (!response.ok) {
      if (retryCount < MAX_RETRIES) {
        await sleep(2000)
        return processSimplification(level, chunkIndex, retryCount + 1)
      }
      return { success: false, level, chunkIndex, error: `HTTP ${response.status}` }
    }
    
    const result = await response.json()
    
    // Only count as success if it's actually simplified
    if (result.source === 'ai_simplified' || result.source === 'cache') {
      return { success: true, level, chunkIndex, quality: result.qualityScore }
    } else {
      return { success: false, level, chunkIndex, error: 'No AI processing' }
    }
    
  } catch (error) {
    if (retryCount < MAX_RETRIES) {
      await sleep(2000)
      return processSimplification(level, chunkIndex, retryCount + 1)
    }
    return { success: false, level, chunkIndex, error: error.message }
  }
}

async function processBatchSequentially(batch) {
  const results = []
  
  for (const item of batch) {
    console.log(`  Processing: ${item.level} chunk ${item.chunkIndex}...`)
    const result = await processSimplification(item.level, item.chunkIndex)
    
    if (result.success) {
      console.log(`    ✅ Success: quality=${result.quality?.toFixed(3) || 'cached'}`)
    } else {
      console.log(`    ❌ Failed: ${result.error}`)
    }
    
    results.push(result)
    
    // Small delay between requests to avoid overwhelming server
    await sleep(DELAY_BETWEEN_REQUESTS)
  }
  
  const successful = results.filter(r => r.success).length
  const failed = results.filter(r => !r.success).length
  
  return { successful, failed, results }
}

async function main() {
  console.log('🚀 RESUMING BULK PROCESSING FOR PRIDE & PREJUDICE')
  console.log('='*60)
  
  try {
    // Step 1: Get total chunks
    console.log('\n📊 Analyzing book structure...')
    const totalChunks = await getBookChunkCount()
    console.log(`  Total chunks: ${totalChunks}`)
    console.log(`  CEFR levels: ${CEFR_LEVELS.join(', ')}`)
    console.log(`  Maximum possible simplifications: ${totalChunks * CEFR_LEVELS.length}`)
    
    // Step 2: Check existing simplifications
    console.log('\n🔍 Checking existing simplifications...')
    const { existing, missing } = await checkExistingSimplifications(totalChunks)
    console.log(`  Already processed: ${existing}`)
    console.log(`  Missing: ${missing.length}`)
    
    if (missing.length === 0) {
      console.log('\n✅ All simplifications already complete!')
      await prisma.$disconnect()
      return
    }
    
    // Group missing by level for better visibility
    const byLevel = {}
    CEFR_LEVELS.forEach(level => {
      byLevel[level] = missing.filter(m => m.level === level).length
    })
    console.log('\n📊 Missing by level:')
    Object.entries(byLevel).forEach(([level, count]) => {
      console.log(`  ${level}: ${count}`)
    })
    
    // Step 3: Process missing simplifications
    console.log('\n📝 Processing missing simplifications...')
    console.log(`  Batch size: ${BATCH_SIZE}`)
    console.log(`  Delay between batches: ${DELAY_BETWEEN_BATCHES}ms`)
    console.log(`  Delay between requests: ${DELAY_BETWEEN_REQUESTS}ms`)
    console.log(`  Estimated time: ${Math.ceil(missing.length * (10 + DELAY_BETWEEN_REQUESTS/1000) / 60)} minutes`)
    
    let totalSuccessful = 0
    let totalFailed = 0
    const failedItems = []
    
    for (let i = 0; i < missing.length; i += BATCH_SIZE) {
      const batch = missing.slice(i, i + BATCH_SIZE)
      const batchNum = Math.floor(i / BATCH_SIZE) + 1
      const totalBatches = Math.ceil(missing.length / BATCH_SIZE)
      
      console.log(`\n📦 Batch ${batchNum}/${totalBatches} (${batch.length} items):`)
      
      const { successful, failed, results } = await processBatchSequentially(batch)
      totalSuccessful += successful
      totalFailed += failed
      
      // Track failed items for retry
      results.filter(r => !r.success).forEach(r => failedItems.push(r))
      
      console.log(`  Batch results: ${successful} successful, ${failed} failed`)
      
      // Progress update
      const progress = ((i + batch.length) / missing.length * 100).toFixed(1)
      console.log(`  Overall progress: ${progress}% (${totalSuccessful} successful, ${totalFailed} failed)`)
      
      // Stop if too many failures
      if (failed === batch.length) {
        console.log('\n⚠️  All items in batch failed. Stopping to prevent further errors.')
        console.log('  Please check server status and try again.')
        break
      }
      
      // Delay between batches
      if (i + BATCH_SIZE < missing.length) {
        console.log(`  Waiting ${DELAY_BETWEEN_BATCHES}ms before next batch...`)
        await sleep(DELAY_BETWEEN_BATCHES)
      }
    }
    
    // Step 4: Final summary
    console.log('\n' + '='*60)
    console.log('📊 FINAL SUMMARY:')
    console.log(`  Total processed: ${totalSuccessful + totalFailed}`)
    console.log(`  Successful: ${totalSuccessful}`)
    console.log(`  Failed: ${totalFailed}`)
    
    if (failedItems.length > 0) {
      console.log('\n❌ Failed items (for manual retry):')
      const failedByLevel = {}
      failedItems.forEach(item => {
        if (!failedByLevel[item.level]) failedByLevel[item.level] = []
        failedByLevel[item.level].push(item.chunkIndex)
      })
      Object.entries(failedByLevel).forEach(([level, chunks]) => {
        console.log(`  ${level}: chunks ${chunks.slice(0, 10).join(', ')}${chunks.length > 10 ? '...' : ''}`)
      })
    }
    
    // Verify completion
    const { existing: finalExisting, missing: finalMissing } = await checkExistingSimplifications(totalChunks)
    console.log(`\n✅ Final status:`)
    console.log(`  Total simplifications in database: ${finalExisting}`)
    console.log(`  Remaining missing: ${finalMissing.length}`)
    
    if (finalMissing.length === 0) {
      console.log('\n🎉 PRIDE & PREJUDICE FULLY PROCESSED!')
    } else {
      console.log('\n⏳ Processing incomplete. Run again to continue.')
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
    console.log('✅ Server is running on port 3004')
    main()
  })
  .catch(() => {
    console.error('❌ Server is not running on port 3004')
    console.error('   Please ensure the dev server is running')
    process.exit(1)
  })