// Direct test of the simplification API with the auth bypass for Gutenberg books

async function testSimplification() {
  console.log('=== TESTING A1 SIMPLIFICATION FOR PRIDE & PREJUDICE ===\n')
  
  const baseUrl = 'http://localhost:3000'
  const bookId = 'gutenberg-1342' // Pride & Prejudice
  const level = 'A1'
  const chunkIndex = 0
  
  try {
    // Test the simplification API directly (no auth needed for Gutenberg books now)
    console.log(`📚 Testing: ${bookId}, Level: ${level}, Chunk: ${chunkIndex}`)
    console.log('🔗 URL:', `${baseUrl}/api/books/${bookId}/simplify?level=${level}&chunkIndex=${chunkIndex}&useAI=true`)
    
    const response = await fetch(
      `${baseUrl}/api/books/${bookId}/simplify?level=${level}&chunkIndex=${chunkIndex}&useAI=true`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      }
    )
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ API Error:', response.status, errorText)
      return
    }
    
    const result = await response.json()
    
    console.log('\n📊 API Response:')
    console.log('  Source:', result.source)
    console.log('  Quality Score:', result.qualityScore)
    console.log('  Stats:', result.stats)
    
    // Compare original vs simplified
    if (result.source === 'cache') {
      console.log('\n⚠️  Result from cache - need to fetch original for comparison')
    }
    
    // Get the original text for comparison
    const contentResponse = await fetch(`${baseUrl}/api/books/${bookId}/content-fast`)
    const bookData = await contentResponse.json()
    const fullText = bookData.context || bookData.content
    
    // Simple chunking to get the original chunk
    const words = fullText.split(/\s+/)
    const chunkSize = 400 // A1 chunk size
    const startIdx = chunkIndex * chunkSize
    const endIdx = Math.min(startIdx + chunkSize, words.length)
    const originalChunk = words.slice(startIdx, endIdx).join(' ')
    
    console.log('\n📝 TEXT COMPARISON:')
    console.log('='*50)
    
    // Show first 200 chars of each
    console.log('ORIGINAL (first 200 chars):')
    console.log(originalChunk.substring(0, 200))
    
    console.log('\nSIMPLIFIED (first 200 chars):')
    console.log(result.content.substring(0, 200))
    
    // Calculate difference metrics
    const origWords = originalChunk.toLowerCase().split(/\s+/)
    const simpWords = result.content.toLowerCase().split(/\s+/)
    
    // Count changed words
    let changedWords = 0
    const minLen = Math.min(origWords.length, simpWords.length)
    for (let i = 0; i < minLen; i++) {
      if (origWords[i] !== simpWords[i]) changedWords++
    }
    
    const changePercentage = (changedWords / minLen) * 100
    
    console.log('\n📈 METRICS:')
    console.log(`  Original words: ${origWords.length}`)
    console.log(`  Simplified words: ${simpWords.length}`)
    console.log(`  Changed words: ${changedWords}`)
    console.log(`  Change percentage: ${changePercentage.toFixed(1)}%`)
    
    // Check if texts are identical
    if (originalChunk === result.content) {
      console.log('\n❌ FAILURE: Text is IDENTICAL - no simplification occurred!')
    } else if (changePercentage < 20) {
      console.log('\n⚠️  WARNING: Only ${changePercentage.toFixed(1)}% change - expected 40%+ for A1')
    } else {
      console.log('\n✅ SUCCESS: Significant simplification detected!')
    }
    
    // Show AI processing details if available
    if (result.aiProcessingDetails) {
      console.log('\n🤖 AI Processing Details:')
      console.log(result.aiProcessingDetails)
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

// Check if server is running
fetch('http://localhost:3000/api/health')
  .then(() => {
    console.log('✅ Server is running')
    testSimplification()
  })
  .catch(() => {
    console.error('❌ Server is not running. Please start the dev server first:')
    console.error('   npm run dev')
  })