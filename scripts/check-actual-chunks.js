const BOOK_ID = 'gutenberg-1342'
const BASE_URL = 'http://localhost:3005'

async function findActualChunkLimit() {
  console.log('🔍 Finding actual chunk limit for Pride & Prejudice...')
  
  // Try chunks in reverse to find the highest valid one
  for (let chunk = 304; chunk >= 0; chunk--) {
    try {
      const url = `${BASE_URL}/api/books/${BOOK_ID}/simplify?level=C2&chunk=${chunk}&useAI=false`
      const response = await fetch(url)
      
      if (response.ok) {
        console.log(`✅ Highest valid chunk: ${chunk}`)
        console.log(`📊 Pride & Prejudice has chunks 0-${chunk} (${chunk + 1} total)`)
        return chunk
      } else if (response.status === 400) {
        console.log(`❌ Chunk ${chunk}: HTTP 400 (out of range)`)
      }
    } catch (error) {
      console.log(`❌ Chunk ${chunk}: ${error.message}`)
    }
  }
}

findActualChunkLimit()