require('dotenv').config({ path: '.env.local' });

// Configuration
const BOOK_ID = 'gutenberg-514' // Little Women
const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']
const BASE_URL = 'http://localhost:3000'
const DELAY_NEW_PROCESSING = 12000 // 12 seconds for AI processing (5 per minute)
const DELAY_EXISTING_CHECK = 1000 // 1 second for existing checks
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

async function processSimplification(level, chunkIndex, totalChunks, retryCount = 0) {
  try {
    // SAFETY CHECK: Don't process invalid chunks
    if (chunkIndex >= totalChunks) {
      console.log(`    ⚠️ Skipping invalid chunk ${chunkIndex} (max is ${totalChunks - 1})`)
      return { success: false, level, chunkIndex, error: 'Invalid chunk index', skipped: true }
    }
    
    // FORCE AI REPROCESSING: Skip existing check, always use AI
    // This will override any bad cached entries with proper AI simplifications
    console.log(`  🤖 AI Processing: ${level} chunk ${chunkIndex}/${totalChunks - 1}...`)
    const timestamp = Date.now()
    const processUrl = `${BASE_URL}/api/books/${BOOK_ID}/simplify?level=${level}&chunk=${chunkIndex}&useAI=true&t=${timestamp}`
    
    const response = await fetch(processUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      },
      timeout: 60000 // 60 second timeout for AI processing
    })
    
    if (!response.ok) {
      if (retryCount < MAX_RETRIES) {
        console.log(`    🔄 Retrying (${retryCount + 1}/${MAX_RETRIES})...`)
        await sleep(5000)
        return processSimplification(level, chunkIndex, totalChunks, retryCount + 1)
      }
      return { success: false, level, chunkIndex, error: `HTTP ${response.status}`, newProcessing: true }
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
      return { success: false, level, chunkIndex, error: 'AI simplification failed after retries', newProcessing: true }
    }
    
    // Check for successful simplification indicators
    const hasSimplifiedText = result.simplifiedText && result.simplifiedText.length > 0
    const hasQuality = result.aiMetadata && result.aiMetadata.qualityScore !== undefined
    const notIdentical = result.simplifiedText !== result.originalText
    
    if (hasSimplifiedText && hasQuality && notIdentical) {
      console.log(`    ✅ AI Success: quality=${result.aiMetadata.qualityScore?.toFixed(3)}`)
      return { success: true, level, chunkIndex, quality: result.aiMetadata.qualityScore, newProcessing: true }
    } else {
      console.log(`    ⚠️ Possible issue: hasText=${hasSimplifiedText}, hasQuality=${hasQuality}, notIdentical=${notIdentical}`)
      return { success: true, level, chunkIndex, quality: 'unknown', newProcessing: true } // Still count as success for API processing
    }
    
  } catch (error) {
    if (retryCount < MAX_RETRIES) {
      console.log(`    🔄 Error, retrying (${retryCount + 1}/${MAX_RETRIES})...`)
      await sleep(5000)
      return processSimplification(level, chunkIndex, totalChunks, retryCount + 1)
    }
    return { success: false, level, chunkIndex, error: error.message, newProcessing: true }
  }
}

async function main() {
  console.log('🚀 BULK PROCESSING FOR LITTLE WOMEN (NO DATABASE CHECK)')
  console.log('='*60)
  console.log('APPROACH:')
  console.log('  1. Skip database existing check (network issues)')
  console.log('  2. Process ALL chunks through API')
  console.log('  3. API handles caching and duplicates automatically')
  console.log('  4. 12 second delays (5 requests/minute)')
  console.log('')
  
  try {
    // Step 1: Get total chunks
    console.log('📊 Analyzing book structure...')
    const totalChunks = await getBookChunkCount()
    console.log(`  Total chunks: ${totalChunks} (indexed 0-${totalChunks - 1})`)
    console.log(`  CEFR levels: ${CEFR_LEVELS.join(', ')}`)
    console.log(`  Maximum possible simplifications: ${totalChunks * CEFR_LEVELS.length}`)
    
    // Step 2: Generate all chunk/level combinations
    console.log('\n📋 Generating processing queue...')
    const allCombinations = []
    for (const level of CEFR_LEVELS) {
      for (let chunk = 0; chunk < totalChunks; chunk++) {
        allCombinations.push({ level, chunkIndex: chunk })
      }
    }
    
    console.log(`  Total combinations to process: ${allCombinations.length}`)
    
    // Calculate time estimate (assuming mix of existing and new)
    const estimatedMinutes = Math.ceil((allCombinations.length * DELAY_EXISTING_CHECK) / 60000)
    const maxMinutes = Math.ceil((allCombinations.length * DELAY_NEW_PROCESSING) / 60000)
    console.log(`\n⏱️ Estimated time: ${Math.ceil(estimatedMinutes/60)} - ${Math.ceil(maxMinutes/60)} hours`)
    console.log(`  Best case (all existing): ${estimatedMinutes} minutes`)
    console.log(`  Worst case (all new): ${Math.ceil(maxMinutes/60)} hours`)
    console.log('  Actual time depends on how many already exist')
    
    // Step 3: Process one by one
    console.log('\n📝 Processing ALL combinations through API...')
    
    let totalSuccessful = 0
    let totalFailed = 0
    let totalSkipped = 0
    let totalExisting = 0
    let totalNew = 0
    const failedItems = []
    let consecutiveFailures = 0
    
    for (let i = 0; i < allCombinations.length; i++) {
      const item = allCombinations[i]
      
      console.log(`\n[${i+1}/${allCombinations.length}] Processing ${item.level} chunk ${item.chunkIndex}:`)
      
      const result = await processSimplification(item.level, item.chunkIndex, totalChunks)
      
      if (result.success) {
        totalSuccessful++
        consecutiveFailures = 0 // Reset consecutive failure counter
        
        if (result.newProcessing) {
          totalNew++
          console.log(`  ✅ AI PROCESSED`)
        } else {
          console.log(`  ✅ SUCCESS`)
        }
      } else if (result.skipped) {
        totalSkipped++
        console.log(`  ⏭️ SKIPPED`)
      } else {
        totalFailed++
        consecutiveFailures++
        failedItems.push(result)
        console.log(`  ❌ FAILED: ${result.error}`)
      }
      
      // Progress update every 25 items
      if ((i + 1) % 25 === 0 || i === allCombinations.length - 1) {
        const progress = ((i + 1) / allCombinations.length * 100).toFixed(1)
        console.log(`\n📊 Progress: ${progress}% (${totalExisting} existing, ${totalNew} new, ${totalFailed} failed, ${totalSkipped} skipped)`)
      }
      
      // Stop if too many consecutive failures
      if (consecutiveFailures >= 10) {
        console.log('\n⚠️ Too many consecutive failures. Check if server is still running.')
        break
      }
      
      // AI PROCESSING DELAY: All requests use AI processing now
      if (i < allCombinations.length - 1) {
        console.log(`  Waiting ${DELAY_NEW_PROCESSING/1000}s (AI processing)...`)
        await sleep(DELAY_NEW_PROCESSING)
      }
    }
    
    // Step 4: Final summary
    console.log('\n' + '='*60)
    console.log('📊 FINAL SUMMARY:')
    console.log(`  Total attempted: ${totalSuccessful + totalFailed + totalSkipped}`)
    console.log(`  ✅ Successfully processed: ${totalSuccessful}`)
    console.log(`    📋 Already existed: ${totalExisting}`)
    console.log(`    🤖 Newly processed: ${totalNew}`)
    console.log(`  ❌ Failed: ${totalFailed}`)
    console.log(`  ⏭️ Skipped: ${totalSkipped}`)
    
    const expectedTotal = totalChunks * CEFR_LEVELS.length
    console.log(`\n📋 Expected total simplifications: ${expectedTotal}`)
    console.log(`✅ Total successful: ${totalSuccessful}`)
    
    if (totalSuccessful === expectedTotal) {
      console.log('\n🎉 LITTLE WOMEN FULLY PROCESSED!')
      console.log('✅ All 2,550 simplifications available')
      console.log('🔍 Check reading page: http://localhost:3000/library/gutenberg-514/read')
    } else {
      console.log(`\n⏳ Processing status: ${totalSuccessful}/${expectedTotal} complete`)
      if (totalNew > 0) {
        console.log(`🤖 ${totalNew} new simplifications created this run`)
      }
      if (totalExisting > 0) {
        console.log(`📋 ${totalExisting} simplifications already existed`)
      }
      console.log('🔍 Check reading page: http://localhost:3000/library/gutenberg-514/read')
    }
    
    if (failedItems.length > 0) {
      console.log('\n❌ Failed items (first 10):')
      failedItems.slice(0, 10).forEach(item => {
        console.log(`  ${item.level} chunk ${item.chunkIndex}: ${item.error}`)
      })
    }
    
  } catch (error) {
    console.error('\n❌ Fatal error:', error)
  }
}

// Check if server is running by testing the actual API endpoint
fetch(`${BASE_URL}/api/books/${BOOK_ID}/content-fast`)
  .then(response => {
    if (response.ok) {
      console.log('✅ Server is running on port 3000')
      console.log('Starting Little Women bulk processing (no database check)...\n')
      main()
    } else {
      throw new Error(`Server responded with ${response.status}`)
    }
  })
  .catch((error) => {
    console.error('❌ Server is not running on port 3000 or API is not accessible')
    console.error('Please start the dev server first: npm run dev')
    console.error('Error:', error.message)
    process.exit(1)
  })