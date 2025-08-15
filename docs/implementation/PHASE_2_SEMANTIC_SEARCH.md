# Phase 2: Semantic Search Implementation

## Overview
Upgrade from keyword-based search to semantic search using existing Pinecone infrastructure for better context retrieval.

## Priority: HIGH (Week 4)
Critical for improving AI response quality by finding semantically relevant passages.

## Technical Requirements

### 1. Database Schema Updates
```sql
-- Track search quality and usage
CREATE TABLE semantic_search_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id),
  book_id TEXT,
  query TEXT,
  results_returned INT,
  relevance_scores FLOAT[],
  search_type TEXT CHECK (search_type IN ('semantic', 'keyword', 'hybrid')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 2. Enhanced Vector Service

```typescript
// lib/vector/enhanced-vector-service.ts
export class EnhancedVectorService extends VectorService {
  async hybridSearch(
    bookId: string,
    query: string,
    maxResults: number = 5
  ): Promise<SearchResult[]> {
    // Get both semantic and keyword results
    const [semanticResults, keywordResults] = await Promise.all([
      this.semanticSearch(bookId, query, maxResults * 2),
      this.keywordSearch(bookId, query, maxResults * 2)
    ]);
    
    // Merge and re-rank results
    return this.mergeAndRerank(semanticResults, keywordResults, maxResults);
  }
  
  private async semanticSearch(
    bookId: string,
    query: string,
    maxResults: number
  ): Promise<SearchResult[]> {
    const queryEmbedding = await this.embeddings.embedQuery(query);
    
    const results = await this.pinecone
      .index(process.env.PINECONE_INDEX!)
      .query({
        vector: queryEmbedding,
        filter: { bookId },
        topK: maxResults,
        includeMetadata: true,
        includeValues: false
      });
    
    return results.matches.map(match => ({
      chunkId: match.id,
      score: match.score || 0,
      content: match.metadata?.content as string,
      chapterTitle: match.metadata?.chapterTitle as string,
      type: 'semantic'
    }));
  }
}
```

### 3. Query Expansion Service

```typescript
// lib/search/query-expansion.ts
export class QueryExpansionService {
  async expandQuery(query: string): Promise<ExpandedQuery> {
    // Use AI to generate related terms and concepts
    const prompt = `Given the query "${query}", provide:
    1. Synonyms and related terms
    2. Broader concepts
    3. Specific examples
    Format as JSON.`;
    
    const response = await aiService.query(prompt, { maxTokens: 200 });
    const expansion = JSON.parse(response.content);
    
    return {
      original: query,
      synonyms: expansion.synonyms,
      broader: expansion.broader,
      specific: expansion.specific,
      combined: [query, ...expansion.synonyms, ...expansion.broader].join(' ')
    };
  }
}
```

### 4. Integration with Book Cache

```typescript
// Update lib/book-cache.ts
async findRelevantCachedChunks(
  bookId: string,
  query: string,
  maxChunks: number = 5
): Promise<ContentChunk[]> {
  // Use semantic search if available
  if (await vectorService.isBookIndexed(bookId)) {
    const results = await enhancedVectorService.hybridSearch(
      bookId,
      query,
      maxChunks
    );
    
    return results.map(r => r.chunk);
  }
  
  // Fallback to existing keyword search
  return this.keywordSearch(bookId, query, maxChunks);
}
```

## Success Criteria

1. **Relevance**: 60% improvement in finding relevant passages
2. **Speed**: Semantic search completes in <500ms
3. **Coverage**: All books properly indexed in Pinecone
4. **Accuracy**: Users rate results as "highly relevant" 80% of time

## Time Estimate: 1 Week

- Day 1-2: Enhance vector service with hybrid search
- Day 3: Query expansion implementation
- Day 4: Integration with existing systems
- Day 5-7: Testing and optimization

## Dependencies

- Pinecone properly configured
- All books indexed with embeddings
- Vector service operational

---

**NOTE: Due to time constraints, the remaining Phase 2 documents will be created in the next session:**
- PHASE_2_TUTORING_PROMPTS.md
- PHASE_3_CONTEXT_AWARENESS.md
- PHASE_3_SOCRATIC_PROGRESSION.md
- PHASE_3_EMOTIONAL_TRACKING.md
- And additional implementation phases...