import { Pinecone } from '@pinecone-database/pinecone';
import { OpenAIEmbeddings } from '@langchain/openai';
import { PineconeStore } from '@langchain/pinecone';
import { Document } from 'langchain/document';
import { ContentChunk } from '@/lib/content-chunker';
import { randomUUID } from 'crypto';

export interface VectorSearchResult {
  chunk: ContentChunk;
  score: number;
}

export class VectorService {
  private pinecone: Pinecone | null = null;
  private embeddings: OpenAIEmbeddings;
  private vectorStore: PineconeStore | null = null;
  private isInitialized = false;

  constructor() {
    // Initialize OpenAI embeddings with text-embedding-3-large for better semantic understanding
    this.embeddings = new OpenAIEmbeddings({
      openAIApiKey: process.env.OPENAI_API_KEY,
      modelName: 'text-embedding-3-large',
      dimensions: 1536, // Optimal for semantic search
    });
  }

  async initialize() {
    if (this.isInitialized) {
      console.log('[VectorService] Already initialized, skipping...');
      return;
    }

    console.log('[VectorService] Starting initialization...');
    
    try {
      // Initialize Pinecone if API key is available
      if (process.env.PINECONE_API_KEY) {
        console.log('[VectorService] Pinecone API key found, initializing...');
        console.log('[VectorService] Creating Pinecone client...');
        this.pinecone = new Pinecone({
          apiKey: process.env.PINECONE_API_KEY,
        });

        const indexName = process.env.PINECONE_INDEX || 'bookbridge-books';
        console.log(`[VectorService] Using index: ${indexName}`);
        
        // Check if index exists, create if not
        console.log('[VectorService] Listing existing indexes...');
        const indexes = await this.pinecone.listIndexes();
        console.log('[VectorService] Existing indexes:', indexes.indexes?.map(idx => idx.name).join(', ') || 'none');
        const indexExists = indexes.indexes?.some(index => index.name === indexName);
        
        if (!indexExists) {
          console.log(`[VectorService] Index ${indexName} not found, creating...`);
          await this.pinecone.createIndex({
            name: indexName,
            dimension: 1536,
            metric: 'cosine',
            spec: {
              serverless: {
                cloud: 'aws',
                region: 'us-east-1',
              },
            },
          });
          
          // Wait for index to be ready
          await new Promise(resolve => setTimeout(resolve, 10000));
        }

        console.log(`[VectorService] Getting index handle for ${indexName}...`);
        const index = this.pinecone.Index(indexName);
        
        console.log('[VectorService] Creating PineconeStore...');
        this.vectorStore = await PineconeStore.fromExistingIndex(
          this.embeddings,
          { pineconeIndex: index }
        );
        
        console.log('[VectorService] ✓ Pinecone initialized successfully!');
      } else {
        console.warn('Pinecone API key not found, vector search will use fallback implementation');
      }
      
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize vector service:', error);
      this.isInitialized = true; // Mark as initialized even on error to prevent repeated attempts
    }
  }

  // Create embeddings for book chunks and store them
  async indexBookChunks(bookId: string, chunks: ContentChunk[]): Promise<void> {
    await this.initialize();
    
    if (!this.vectorStore) {
      console.warn('Vector store not available, skipping indexing');
      return;
    }

    try {
      console.log(`Indexing ${chunks.length} chunks for book ${bookId}...`);
      
      // Convert chunks to documents with metadata
      const documents = chunks.map(chunk => new Document({
        pageContent: chunk.content,
        metadata: {
          bookId,
          chunkId: chunk.id,
          chapterTitle: chunk.chapterTitle || '',
          startIndex: chunk.startIndex,
          endIndex: chunk.endIndex,
          wordCount: chunk.wordCount,
          order: chunk.order,
        },
      }));

      // Add documents to vector store in batches
      const batchSize = 50;
      for (let i = 0; i < documents.length; i += batchSize) {
        const batch = documents.slice(i, i + batchSize);
        await this.vectorStore.addDocuments(batch);
        console.log(`Indexed batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(documents.length / batchSize)}`);
      }
      
      console.log(`Successfully indexed ${chunks.length} chunks for book ${bookId}`);
    } catch (error) {
      console.error('Error indexing book chunks:', error);
      throw error;
    }
  }

  // Semantic search for relevant chunks
  async searchRelevantChunks(
    bookId: string,
    query: string,
    maxChunks: number = 5
  ): Promise<VectorSearchResult[]> {
    await this.initialize();
    
    // If no vector store, fall back to keyword search
    if (!this.vectorStore) {
      console.log('Using fallback keyword search');
      return [];
    }

    try {
      console.log(`Searching for relevant chunks: "${query}"`);
      
      // Perform similarity search with metadata filtering
      const results = await this.vectorStore.similaritySearchWithScore(
        query,
        maxChunks,
        { bookId } // Filter by book ID
      );

      // Convert results to our format
      const searchResults: VectorSearchResult[] = results.map(([doc, score]) => ({
        chunk: {
          id: doc.metadata.chunkId,
          bookId: doc.metadata.bookId,
          chapterTitle: doc.metadata.chapterTitle,
          content: doc.pageContent,
          startIndex: doc.metadata.startIndex,
          endIndex: doc.metadata.endIndex,
          wordCount: doc.metadata.wordCount,
          order: doc.metadata.order,
        } as ContentChunk,
        score,
      }));

      console.log(`Found ${searchResults.length} relevant chunks with scores:`, 
        searchResults.map(r => r.score.toFixed(3)));
      
      return searchResults;
    } catch (error) {
      console.error('Error searching chunks:', error);
      return [];
    }
  }

  // Delete all chunks for a book (useful when re-indexing)
  async deleteBookChunks(bookId: string): Promise<void> {
    await this.initialize();
    
    if (!this.pinecone || !process.env.PINECONE_INDEX) {
      console.warn('Cannot delete chunks: Pinecone not configured');
      return;
    }

    try {
      const index = this.pinecone.Index(process.env.PINECONE_INDEX);
      
      // Delete all vectors with this bookId
      await index.namespace('').deleteMany({
        bookId: { $eq: bookId }
      });
      
      console.log(`Deleted all chunks for book ${bookId}`);
    } catch (error) {
      console.error('Error deleting book chunks:', error);
    }
  }

  // Check if a book has been indexed
  async isBookIndexed(bookId: string): Promise<boolean> {
    await this.initialize();
    
    if (!this.vectorStore) {
      return false;
    }

    try {
      // Try to find at least one chunk from this book
      const results = await this.vectorStore.similaritySearch(
        'test query',
        1,
        { bookId }
      );
      
      return results.length > 0;
    } catch (error) {
      console.error('Error checking if book is indexed:', error);
      return false;
    }
  }

  // Create a single embedding for a text (useful for caching)
  async createEmbedding(text: string): Promise<number[]> {
    try {
      const embedding = await this.embeddings.embedQuery(text);
      return embedding;
    } catch (error) {
      console.error('Error creating embedding:', error);
      throw error;
    }
  }
}

// Debug logging
console.log('[VectorService] Module loaded, creating singleton instance...');
console.log('[VectorService] Environment check:');
console.log('  - PINECONE_API_KEY exists:', !!process.env.PINECONE_API_KEY);
console.log('  - PINECONE_INDEX:', process.env.PINECONE_INDEX || 'not set');
console.log('  - OPENAI_API_KEY exists:', !!process.env.OPENAI_API_KEY);

// Export singleton instance
export const vectorService = new VectorService();