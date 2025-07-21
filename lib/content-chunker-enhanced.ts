import { ContentChunk, ContentChunker } from './content-chunker';
import { vectorService, VectorSearchResult } from './vector/vector-service';

export class EnhancedContentChunker extends ContentChunker {
  // Override findRelevantChunks to use vector search when available
  async findRelevantChunksAsync(
    bookId: string,
    chunks: ContentChunk[],
    query: string,
    maxChunks: number = 5
  ): Promise<ContentChunk[]> {
    try {
      // Try vector search first
      const vectorResults = await vectorService.searchRelevantChunks(
        bookId,
        query,
        maxChunks
      );
      
      if (vectorResults.length > 0) {
        console.log('Using vector search results');
        return vectorResults.map(result => result.chunk);
      }
      
      // Fall back to keyword search if vector search returns no results
      console.log('Falling back to keyword search');
      return super.findRelevantChunks(chunks, query, maxChunks);
    } catch (error) {
      console.error('Error in async chunk search:', error);
      // Fall back to keyword search on error
      return super.findRelevantChunks(chunks, query, maxChunks);
    }
  }
  
  // Index chunks after creating them
  async chunkAndIndex(
    bookId: string,
    fullText: string,
    chapters?: Array<{ title: string; content: string; order: number }>
  ): Promise<ContentChunk[]> {
    // First, create chunks using the parent method
    const chunks = this.chunk(bookId, fullText, chapters);
    
    try {
      // Check if book is already indexed
      const isIndexed = await vectorService.isBookIndexed(bookId);
      
      if (!isIndexed) {
        console.log(`Book ${bookId} not indexed, indexing now...`);
        // Index the chunks for vector search
        await vectorService.indexBookChunks(bookId, chunks);
      } else {
        console.log(`Book ${bookId} already indexed, skipping indexing`);
      }
    } catch (error) {
      console.error('Error indexing chunks:', error);
      // Continue even if indexing fails
    }
    
    return chunks;
  }
  
  // Create an enhanced context that combines vector search with keyword relevance
  async createEnhancedContextFromQuery(
    bookId: string,
    chunks: ContentChunk[],
    query: string,
    maxWords: number = 3000
  ): Promise<string> {
    // Get relevant chunks using vector search or keyword fallback
    const relevantChunks = await this.findRelevantChunksAsync(
      bookId,
      chunks,
      query,
      Math.ceil(maxWords / 300) // Estimate chunks needed based on avg chunk size
    );
    
    // Create context from the relevant chunks
    return this.createContextFromChunks(relevantChunks, maxWords);
  }
}

export const enhancedContentChunker = new EnhancedContentChunker();