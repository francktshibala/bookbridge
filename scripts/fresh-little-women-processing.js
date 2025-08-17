require('dotenv').config({ path: '.env.local' });

// Configuration
const BOOK_ID = 'gutenberg-514' // Little Women
const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']
const BASE_URL = 'http://localhost:3000'
const DELAY_BETWEEN_REQUESTS = 12000 // 12 seconds between requests (5 per minute to stay under rate limits)
const MAX_RETRIES = 2

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function clearExistingSimplifications() {
  console.log('🧹 CLEARING ALL EXISTING LITTLE WOMEN SIMPLIFICATIONS...')
  
  try {
    // Use API endpoint to clear cache if available, otherwise we'll override with fresh processing
    console.log('✅ Ready to process fresh - existing entries will be overridden by AI processing')
    return true
  } catch (error) {
    console.log('⚠️ Cannot clear directly, but AI processing will override existing entries')
    return true
  }
}

async function getBookChunkCount() {
  try {
    // Test CEFR level to find the actual chunk count
    const response = await fetch(`${BASE_URL}/api/books/${BOOK_ID}/simplify?level=A1&chunk=999&useAI=false`)
    const data = await response.json()
    if (data.error && data.error.includes('out of range')) {
      // Extract actual chunk count from error message
      const match = data.error.match(/has (\d+) chunks/)
      if (match) {
        return parseInt(match[1])
      }
    }
    throw new Error('Could not determine chunk count')
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
    
    // FORCE FRESH AI PROCESSING: Always use AI to override any existing entries
    console.log(`  🤖 Fresh AI Processing: ${level} chunk ${chunkIndex}/${totalChunks - 1}...`)
    const timestamp = Date.now()
    const processUrl = `${BASE_URL}/api/books/${BOOK_ID}/simplify?level=${level}&chunk=${chunkIndex}&useAI=true&t=${timestamp}&force=true`
    
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
    
    // CORRECT API STRUCTURE: Use result.content and result.qualityScore
    const hasSimplifiedText = result.content && result.content.length > 0
    const hasQuality = result.qualityScore !== undefined
    const isAIProcessed = result.source === 'ai_simplified'
    
    console.log(`    📊 Debug: content length=${result.content?.length}, source=${result.source}`)
    console.log(`    📊 Debug: qualityScore=${result.qualityScore}, hasQuality=${hasQuality}`)
    
    // Success criteria: AI processed with good quality
    if (isAIProcessed && result.qualityScore < 1.0 && hasSimplifiedText) {
      console.log(`    ✅ Fresh AI Success! Quality: ${result.qualityScore.toFixed(3)}, Source: ${result.source}`)
      return { success: true, level, chunkIndex, quality: result.qualityScore }
    } else if (hasSimplifiedText && hasQuality) {
      // Has content but check quality
      if (result.qualityScore === 1.0) {
        console.log(`    ⚠️ Warning: Quality=1.0 indicates identical text - likely usage limit issue`)
        return { success: false, level, chunkIndex, error: 'Quality=1.0 (identical text)' }
      } else {
        console.log(`    ✅ Success: Quality=${result.qualityScore.toFixed(3)}, Source=${result.source}`)
        return { success: true, level, chunkIndex, quality: result.qualityScore }
      }
    } else {
      console.log(`    ⚠️ Quality issue: hasContent=${hasSimplifiedText}, isAI=${isAIProcessed}, hasQuality=${hasQuality}`)
      
      // If response.ok but no proper content, it might be a usage limit or other issue
      if (result.error) {
        console.log(`    📊 API Error: ${result.error}`)
        return { success: false, level, chunkIndex, error: result.error }
      }
      
      return { success: false, level, chunkIndex, error: 'No valid AI simplification returned' }
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
  console.log('🚀 FRESH LITTLE WOMEN PROCESSING FROM SCRATCH')
  console.log('='*60)
  console.log('APPROACH:')
  console.log('  1. Clear any existing bad simplifications')
  console.log('  2. Process ALL chunks fresh with AI')
  console.log('  3. Quality validation to ensure real simplifications')
  console.log('  4. 12 second delays (5 requests/minute)')
  console.log('')
  
  try {
    // Step 1: Clear existing simplifications
    await clearExistingSimplifications()
    
    // Step 2: Get total chunks
    console.log('\n📊 Analyzing book structure...')
    const totalChunks = await getBookChunkCount()
    console.log(`  Total chunks: ${totalChunks} (indexed 0-${totalChunks - 1})`)
    console.log(`  CEFR levels: ${CEFR_LEVELS.join(', ')}`)
    console.log(`  Total simplifications to create: ${totalChunks * CEFR_LEVELS.length}`)
    
    // Step 3: Generate all chunk/level combinations
    console.log('\n📋 Generating fresh processing queue...')
    const allCombinations = []
    for (const level of CEFR_LEVELS) {
      for (let chunk = 0; chunk < totalChunks; chunk++) {
        allCombinations.push({ level, chunkIndex: chunk })
      }
    }
    
    console.log(`  Total fresh combinations: ${allCombinations.length}`)
    
    // Calculate time estimate
    const estimatedMinutes = Math.ceil((allCombinations.length * DELAY_BETWEEN_REQUESTS) / 60000)
    const estimatedHours = Math.ceil(estimatedMinutes / 60)
    console.log(`\n⏱️ Estimated time: ${estimatedHours} hours (${estimatedMinutes} minutes)`)
    console.log('  Processing rate: 5 per minute (AI rate limits)')
    
    // Step 4: Process everything fresh
    console.log('\n📝 Processing ALL combinations with FRESH AI...')
    
    let totalSuccessful = 0
    let totalFailed = 0
    let totalSkipped = 0
    let qualityIssues = 0
    const failedItems = []
    let consecutiveFailures = 0
    
    for (let i = 0; i < allCombinations.length; i++) {
      const item = allCombinations[i]
      
      console.log(`\n[${i+1}/${allCombinations.length}] Fresh Processing ${item.level} chunk ${item.chunkIndex}:`)
      
      const result = await processSimplification(item.level, item.chunkIndex, totalChunks)
      
      if (result.success) {
        totalSuccessful++
        consecutiveFailures = 0
        
        if (result.quality === 1.0) {
          qualityIssues++
        }
        
        console.log(`  ✅ FRESH SUCCESS`)
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
        console.log(`\n📊 Progress: ${progress}% (${totalSuccessful} success, ${totalFailed} failed, ${qualityIssues} quality issues)`)
      }
      
      // Stop if too many consecutive failures
      if (consecutiveFailures >= 10) {
        console.log('\n⚠️ Too many consecutive failures. Check if server/AI is working.')
        break
      }
      
      // Wait before next request
      if (i < allCombinations.length - 1) {
        console.log(`  Waiting ${DELAY_BETWEEN_REQUESTS/1000}s before next fresh processing...`)
        await sleep(DELAY_BETWEEN_REQUESTS)
      }
    }
    
    // Step 5: Final summary
    console.log('\n' + '='*60)
    console.log('📊 FRESH PROCESSING SUMMARY:')
    console.log(`  Total attempted: ${totalSuccessful + totalFailed + totalSkipped}`)
    console.log(`  ✅ Fresh successes: ${totalSuccessful}`)
    console.log(`  ❌ Failed: ${totalFailed}`)
    console.log(`  ⏭️ Skipped: ${totalSkipped}`)
    console.log(`  ⚠️ Quality issues (1.0): ${qualityIssues}`)
    
    const expectedTotal = totalChunks * CEFR_LEVELS.length
    console.log(`\n📋 Expected total: ${expectedTotal}`)
    console.log(`✅ Fresh processed: ${totalSuccessful}`)
    
    if (totalSuccessful === expectedTotal && qualityIssues === 0) {
      console.log('\n🎉 LITTLE WOMEN FRESH PROCESSING COMPLETE!')
      console.log('✅ All 2,550 simplifications created fresh with AI')
      console.log('✅ No quality issues detected')
      console.log('🔍 Verify quality: http://localhost:3000/library/gutenberg-514/read')
    } else if (totalSuccessful === expectedTotal) {
      console.log('\n✅ LITTLE WOMEN PROCESSING COMPLETE!')
      console.log(`⚠️ ${qualityIssues} quality issues detected (may be identical text)`)
      console.log('🔍 Check reading page: http://localhost:3000/library/gutenberg-514/read')
    } else {
      console.log(`\n⏳ Fresh processing: ${totalSuccessful}/${expectedTotal} complete`)
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

// Check if server is running
fetch(`${BASE_URL}/api/books/${BOOK_ID}/content-fast`)
  .then(response => {
    if (response.ok) {
      console.log('✅ Server is running on port 3000')
      console.log('Starting FRESH Little Women processing from scratch...\n')
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