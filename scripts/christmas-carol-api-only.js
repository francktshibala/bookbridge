// API-ONLY A Christmas Carol Processing Script
// Bypasses database connection issues by using only HTTP API calls

// Configuration
const BOOK_ID = 'gutenberg-46' // A Christmas Carol by Charles Dickens
const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']
const BASE_URL = 'http://localhost:3006'
const DELAY_EXISTING = 1000  // 1 second for existing simplifications
const DELAY_NEW = 12000      // 12 seconds for new AI processing
const MAX_RETRIES = 2

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function getBookChunkCount() {
  try {
    const response = await fetch(`${BASE_URL}/api/books/${BOOK_ID}/simplify?level=A1&chunk=999&useAI=false`)
    const data = await response.json()
    if (data.error && data.error.includes('out of range')) {
      const match = data.error.match(/has (\d+) chunks/)
      if (match) {
        return parseInt(match[1])
      }
    }
    throw new Error('Could not determine chunk count')
  } catch (error) {
    console.error('Failed to get chunk count:', error)
    throw error
  }
}

async function checkIfExists(level, chunk) {
  try {
    const response = await fetch(`${BASE_URL}/api/books/${BOOK_ID}/simplify?level=${level}&chunk=${chunk}&useAI=false`)
    return response.ok
  } catch (error) {
    return false
  }
}

async function processSimplification(level, chunk, totalChunks) {
  try {
    console.log(`[${getCurrentProgress()}] Processing ${level} chunk ${chunk}:`)
    
    // First check if it already exists and is properly simplified
    console.log(`  Checking if exists: ${level} chunk ${chunk}/${totalChunks - 1}...`)
    const checkResponse = await fetch(`${BASE_URL}/api/books/${BOOK_ID}/simplify?level=${level}&chunk=${chunk}&useAI=false`)
    
    if (checkResponse.ok) {
      const checkData = await checkResponse.json()
      if (checkData.source === 'ai_simplified' && checkData.qualityScore < 1.0) {
        console.log(`    ✅ Already properly simplified - skipping`)
        await sleep(DELAY_EXISTING)
        return { success: true, existed: true, level, chunk }
      }
    }

    // Process new simplification
    console.log(`    🔄 Creating new AI simplification...`)
    const timestamp = Date.now()
    const url = `${BASE_URL}/api/books/${BOOK_ID}/simplify?level=${level}&chunk=${chunk}&useAI=true&t=${timestamp}`
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const data = await response.json()
    
    if (data.success && data.source === 'ai_simplified') {
      console.log(`    ✅ SUCCESS - quality=${data.qualityScore?.toFixed(3) || 'N/A'}`)
      await sleep(DELAY_NEW)
      return { success: true, existed: false, level, chunk, quality: data.qualityScore }
    } else {
      throw new Error(`API returned success=false or wrong source: ${data.source}`)
    }

  } catch (error) {
    console.log(`    ❌ FAILED: ${error.message}`)
    await sleep(DELAY_NEW)
    return { success: false, level, chunk, error: error.message }
  }
}

let currentItem = 0
let totalItems = 0

function getCurrentProgress() {
  return `${currentItem}/${totalItems}`
}

async function main() {
  console.log('🎄 Starting API-only A Christmas Carol processing...')
  console.log(`🎯 Target: ${BASE_URL}`)
  
  try {
    // Get total chunks
    const totalChunks = await getBookChunkCount()
    totalItems = totalChunks * CEFR_LEVELS.length
    console.log(`📊 Found ${totalChunks} chunks × ${CEFR_LEVELS.length} levels = ${totalItems} total items`)
    
    const results = {
      completed: 0,
      skipped: 0,
      failed: 0,
      failures: []
    }

    // Process all combinations
    for (let chunk = 0; chunk < totalChunks; chunk++) {
      for (const level of CEFR_LEVELS) {
        currentItem++
        
        const result = await processSimplification(level, chunk, totalChunks)
        
        if (result.success) {
          if (result.existed) {
            results.skipped++
          } else {
            results.completed++
          }
        } else {
          results.failed++
          results.failures.push(result)
        }
      }
    }

    // Final summary
    console.log('\n🎉 PROCESSING COMPLETE!')
    console.log(`✅ Completed: ${results.completed}`)
    console.log(`⏭️ Skipped (existed): ${results.skipped}`)
    console.log(`❌ Failed: ${results.failed}`)
    
    if (results.failures.length > 0) {
      console.log('\n❌ Failures:')
      results.failures.forEach(f => {
        console.log(`  ${f.level} chunk ${f.chunk}: ${f.error}`)
      })
    }

  } catch (error) {
    console.error('❌ Fatal error:', error)
    process.exit(1)
  }
}

// Run the script
main().catch(console.error)