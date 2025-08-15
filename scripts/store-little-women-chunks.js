const { createClient } = require('@supabase/supabase-js')
const { PrismaClient } = require('@prisma/client')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)
const prisma = new PrismaClient()

const BOOK_ID = 'gutenberg-514'
const CHUNK_SIZE = 3000 // Characters per chunk

async function storeChunks() {
  console.log('📚 Storing chunks for Little Women...')
  
  try {
    // Fetch the full book content
    const response = await fetch(`http://localhost:3005/api/books/${BOOK_ID}/content-fast`)
    const data = await response.json()
    
    if (!data.content) {
      console.error('❌ No content found for Little Women')
      return
    }
    
    const fullText = data.content
    console.log(`📖 Book length: ${fullText.length} characters`)
    
    // Split into chunks
    const chunks = []
    for (let i = 0; i < fullText.length; i += CHUNK_SIZE) {
      chunks.push(fullText.slice(i, i + CHUNK_SIZE))
    }
    
    console.log(`📦 Created ${chunks.length} chunks`)
    
    // Store in book_content table
    const { error } = await supabase
      .from('book_content')
      .upsert({
        book_id: BOOK_ID,
        title: data.title,
        author: data.author,
        content: fullText,
        chunks: chunks,
        chunk_size: CHUNK_SIZE,
        total_chunks: chunks.length,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
    
    if (error) {
      console.error('❌ Error storing chunks:', error)
    } else {
      console.log(`✅ Successfully stored ${chunks.length} chunks for Little Women`)
    }
    
    // Also store individual chunks in book_chunks table
    for (let i = 0; i < chunks.length; i++) {
      await supabase
        .from('book_chunks')
        .upsert({
          book_id: BOOK_ID,
          chunk_index: i,
          content: chunks[i],
          created_at: new Date().toISOString()
        })
    }
    
    console.log('✅ Individual chunks also stored in book_chunks table')
    
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Set environment variables
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://xsolwqqdbsuydwmmwtsl.supabase.co'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhzb2x3cXFkYnN1eWR3bW13dHNsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjgwODQxNywiZXhwIjoyMDY4Mzg0NDE3fQ.eLZTCghWlWf_soWot9csr-UGfKdFW1Ogj60LRvjs8GI'

storeChunks()