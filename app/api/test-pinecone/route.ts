import { NextResponse } from 'next/server'
import { vectorService } from '@/lib/vector/vector-service'

export async function GET() {
  try {
    console.log('Testing Pinecone initialization...')
    console.log('Environment check:')
    console.log('- PINECONE_API_KEY exists:', !!process.env.PINECONE_API_KEY)
    console.log('- PINECONE_API_KEY length:', process.env.PINECONE_API_KEY?.length || 0)
    console.log('- PINECONE_INDEX:', process.env.PINECONE_INDEX)
    console.log('- OPENAI_API_KEY exists:', !!process.env.OPENAI_API_KEY)
    
    // Force initialization
    await vectorService.initialize()
    
    // Test creating an embedding
    try {
      const testEmbedding = await vectorService.createEmbedding('This is a test sentence')
      console.log('Embedding created successfully, dimensions:', testEmbedding.length)
    } catch (embeddingError) {
      console.error('Embedding creation failed:', embeddingError)
    }
    
    // Test if a book is indexed
    const testBookId = 'test-book-id'
    const isIndexed = await vectorService.isBookIndexed(testBookId)
    console.log(`Book ${testBookId} indexed:`, isIndexed)
    
    return NextResponse.json({
      success: true,
      message: 'Pinecone test completed',
      env: {
        hasPineconeKey: !!process.env.PINECONE_API_KEY,
        pineconeKeyLength: process.env.PINECONE_API_KEY?.length || 0,
        pineconeIndex: process.env.PINECONE_INDEX,
        hasOpenAIKey: !!process.env.OPENAI_API_KEY
      }
    })
  } catch (error) {
    console.error('Pinecone test failed:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}