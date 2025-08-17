// API-ONLY The Call of the Wild Processing Script
// Fresh processing for user's session

// Configuration
const BOOK_ID = 'gutenberg-215' // The Call of the Wild by Jack London
const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']
const BASE_URL = 'http://localhost:3006'
const DELAY_NEW = 12000      // 12 seconds for new AI processing

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

async function processSimplification(level, chunk, totalChunks) {
  try {
    console.log(`[${getCurrentProgress()}] Processing ${level} chunk ${chunk}:`)
    
    // Force create new AI simplification
    console.log(`    🔄 Creating fresh AI simplification...`)
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
      return { success: true, level, chunk, quality: data.qualityScore }
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
  console.log('🐺 Starting fresh Call of the Wild processing...')
  console.log(`🎯 Target: ${BASE_URL}`)
  
  try {
    // Get total chunks
    const totalChunks = await getBookChunkCount()
    totalItems = totalChunks * CEFR_LEVELS.length
    console.log(`📊 Found ${totalChunks} chunks × ${CEFR_LEVELS.length} levels = ${totalItems} total items`)
    
    const results = {
      completed: 0,
      failed: 0,
      failures: []
    }

    // Process all combinations
    for (let chunk = 0; chunk < totalChunks; chunk++) {
      for (const level of CEFR_LEVELS) {
        currentItem++
        
        const result = await processSimplification(level, chunk, totalChunks)
        
        if (result.success) {
          results.completed++
        } else {
          results.failed++
          results.failures.push(result)
        }
      }
    }

    // Final summary
    console.log('\n🎉 PROCESSING COMPLETE!')
    console.log(`✅ Completed: ${results.completed}`)
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