export interface ContentChunk {
  id: string;
  bookId: string;
  chapterTitle?: string;
  content: string;
  startIndex: number;
  endIndex: number;
  wordCount: number;
  order: number;
}

export interface ChunkingOptions {
  maxChunkSize?: number; // in words
  overlapSize?: number; // in words
  preserveSentences?: boolean;
  preserveParagraphs?: boolean;
}

export class ContentChunker {
  private readonly DEFAULT_CHUNK_SIZE = 1500; // words
  private readonly DEFAULT_OVERLAP = 200; // words
  
  chunk(
    bookId: string,
    fullText: string,
    chapters?: Array<{ title: string; content: string; order: number }>,
    options: ChunkingOptions = {}
  ): ContentChunk[] {
    const {
      maxChunkSize = this.DEFAULT_CHUNK_SIZE,
      overlapSize = this.DEFAULT_OVERLAP,
      preserveSentences = true,
      preserveParagraphs = false
    } = options;

    const chunks: ContentChunk[] = [];
    let chunkOrder = 0;

    // If chapters are available, chunk each chapter separately
    if (chapters && chapters.length > 0) {
      for (const chapter of chapters) {
        const chapterChunks = this.chunkText(
          bookId,
          chapter.content,
          maxChunkSize,
          overlapSize,
          preserveSentences,
          preserveParagraphs,
          chunkOrder,
          chapter.title
        );
        chunks.push(...chapterChunks);
        chunkOrder += chapterChunks.length;
      }
    } else {
      // Chunk the entire text as one unit
      const textChunks = this.chunkText(
        bookId,
        fullText,
        maxChunkSize,
        overlapSize,
        preserveSentences,
        preserveParagraphs,
        0
      );
      chunks.push(...textChunks);
    }

    return chunks;
  }

  private chunkText(
    bookId: string,
    text: string,
    maxChunkSize: number,
    overlapSize: number,
    preserveSentences: boolean,
    preserveParagraphs: boolean,
    startOrder: number,
    chapterTitle?: string
  ): ContentChunk[] {
    const chunks: ContentChunk[] = [];
    
    // Split text into units (paragraphs or sentences)
    let units: string[];
    if (preserveParagraphs) {
      units = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
    } else if (preserveSentences) {
      // Simple sentence splitting (can be improved)
      units = text.match(/[^.!?]+[.!?]+/g) || [text];
    } else {
      // Split by words
      units = text.split(/\s+/);
    }

    let currentChunk = '';
    let currentWordCount = 0;
    let chunkStartIndex = 0;
    let order = startOrder;

    for (let i = 0; i < units.length; i++) {
      const unit = units[i];
      const unitWords = unit.trim().split(/\s+/).filter(w => w.length > 0);
      const unitWordCount = unitWords.length;

      // Check if adding this unit would exceed chunk size
      if (currentWordCount > 0 && currentWordCount + unitWordCount > maxChunkSize) {
        // Save current chunk
        const chunkContent = currentChunk.trim();
        chunks.push({
          id: `${bookId}-chunk-${order}`,
          bookId,
          chapterTitle,
          content: chunkContent,
          startIndex: chunkStartIndex,
          endIndex: chunkStartIndex + chunkContent.length,
          wordCount: currentWordCount,
          order
        });

        // Start new chunk with overlap
        if (overlapSize > 0 && i > 0) {
          // Go back to include overlap
          const overlapUnits: string[] = [];
          let overlapWordCount = 0;
          
          for (let j = i - 1; j >= 0 && overlapWordCount < overlapSize; j--) {
            const overlapUnit = units[j];
            const overlapUnitWords = overlapUnit.trim().split(/\s+/).filter(w => w.length > 0);
            overlapWordCount += overlapUnitWords.length;
            overlapUnits.unshift(overlapUnit);
            
            if (overlapWordCount >= overlapSize) break;
          }
          
          currentChunk = overlapUnits.join(preserveParagraphs ? '\n\n' : ' ') + (preserveParagraphs ? '\n\n' : ' ');
          currentWordCount = overlapWordCount;
        } else {
          currentChunk = '';
          currentWordCount = 0;
        }
        
        chunkStartIndex = chunkStartIndex + chunkContent.length;
        order++;
      }

      // Add unit to current chunk
      if (currentChunk) {
        currentChunk += (preserveParagraphs ? '\n\n' : ' ');
      }
      currentChunk += unit;
      currentWordCount += unitWordCount;
    }

    // Don't forget the last chunk
    if (currentChunk.trim()) {
      chunks.push({
        id: `${bookId}-chunk-${order}`,
        bookId,
        chapterTitle,
        content: currentChunk.trim(),
        startIndex: chunkStartIndex,
        endIndex: text.length,
        wordCount: currentWordCount,
        order
      });
    }

    return chunks;
  }

  // Find relevant chunks based on a query
  findRelevantChunks(
    chunks: ContentChunk[],
    query: string,
    maxChunks: number = 3
  ): ContentChunk[] {
    // Check if this is an overview/about query
    const overviewQueries = [
      /what.*book.*about/i,
      /summary/i,
      /overview/i,
      /main theme/i,
      /tell me about/i,
      /introduction/i
    ];
    
    const isOverviewQuery = overviewQueries.some(pattern => pattern.test(query));
    
    // For overview queries, prioritize the beginning of the book
    if (isOverviewQuery && chunks.length > 0) {
      // Get first few chunks (usually contains introduction/overview)
      const introChunks = chunks.slice(0, Math.min(3, chunks.length));
      
      // Also try to find chunks with overview keywords
      const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
      const scoredChunks = chunks.slice(3).map(chunk => {
        const chunkLower = chunk.content.toLowerCase();
        let score = 0;
        
        // Score based on keyword matches
        for (const word of queryWords) {
          const matches = (chunkLower.match(new RegExp(`\\b${word}\\b`, 'g')) || []).length;
          score += matches * (word.length > 5 ? 2 : 1);
        }
        
        // Bonus for overview-related content
        const overviewKeywords = ['introduction', 'preface', 'foreword', 'overview', 'summary', 'about'];
        for (const keyword of overviewKeywords) {
          if (chunkLower.includes(keyword)) {
            score += 5;
          }
        }
        
        return { chunk, score };
      });
      
      // Get best scoring chunks from the rest
      const bestScored = scoredChunks
        .filter(item => item.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, Math.max(0, maxChunks - introChunks.length))
        .map(item => item.chunk);
      
      // Combine intro chunks with best scored chunks
      return [...introChunks, ...bestScored].slice(0, maxChunks);
    }
    
    // Simple keyword-based relevance scoring for other queries
    const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    
    const scoredChunks = chunks.map(chunk => {
      const chunkLower = chunk.content.toLowerCase();
      let score = 0;
      
      // Score based on keyword matches
      for (const word of queryWords) {
        const matches = (chunkLower.match(new RegExp(`\\b${word}\\b`, 'g')) || []).length;
        score += matches * (word.length > 5 ? 2 : 1); // Weight longer words more
      }
      
      // Bonus for exact phrase matches
      if (chunkLower.includes(query.toLowerCase())) {
        score += 10;
      }
      
      return { chunk, score };
    });

    // Sort by score and return top chunks
    return scoredChunks
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, maxChunks)
      .map(item => item.chunk);
  }

  // Create a summary of chunks for AI context
  createContextFromChunks(chunks: ContentChunk[], maxWords: number = 3000): string {
    let context = '';
    let wordCount = 0;
    
    for (const chunk of chunks) {
      if (wordCount + chunk.wordCount > maxWords) {
        // Add partial chunk if there's room
        const remainingWords = maxWords - wordCount;
        if (remainingWords > 100) {
          const words = chunk.content.split(/\s+/);
          const partialContent = words.slice(0, remainingWords).join(' ');
          
          if (chunk.chapterTitle) {
            context += `\n\n[Chapter: ${chunk.chapterTitle}]\n${partialContent}...`;
          } else {
            context += `\n\n${partialContent}...`;
          }
        }
        break;
      }
      
      if (chunk.chapterTitle) {
        context += `\n\n[Chapter: ${chunk.chapterTitle}]\n${chunk.content}`;
      } else {
        context += `\n\n${chunk.content}`;
      }
      
      wordCount += chunk.wordCount;
    }
    
    return context.trim();
  }
}

export const contentChunker = new ContentChunker();