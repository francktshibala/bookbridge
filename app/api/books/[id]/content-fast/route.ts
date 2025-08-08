import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { bookCacheService } from '@/lib/book-cache'
import { bookProcessorService } from '@/lib/book-processor'
import { prisma } from '@/lib/prisma'
import { gutenbergAPI } from '@/lib/book-sources/gutenberg-api'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    console.log('Fast content fetch for book ID:', id)

    // Check if this is an external book (skip auth for external books)
    const isExternalBook = id.includes('-') && !id.match(/^[0-9a-f-]{36}$/);
    
    if (!isExternalBook) {
      // Get user from Supabase auth (only for internal books)
      const supabase = await createClient()
      const { data: { user }, error: authError } = await supabase.auth.getUser()

      if (authError || !user) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        )
      }
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('query')
    const maxChunks = parseInt(searchParams.get('maxChunks') || '5')
    const maxWords = parseInt(searchParams.get('maxWords') || '3000')

    // Handle external books
    if (isExternalBook) {
      console.log(`External book detected: ${id}`)
      
      // For external books, fetch content via the external API route
      try {
        const [source, ...bookIdParts] = id.split('-');
        const bookId = bookIdParts.join('-'); // Handle IDs with dashes
        
        if (!['gutenberg', 'openlibrary', 'standardebooks', 'googlebooks'].includes(source) || !bookId) {
          return NextResponse.json(
            { error: 'Invalid external book ID format. Expected: gutenberg-123, openlibrary-OL123W, standardebooks-author-title, or googlebooks-abc123' },
            { status: 400 }
          );
        }

        // Handle different source types - fetch from external API
        const apiUrl = `${request.nextUrl.origin}/api/books/external/${id}`;
        const response = await fetch(apiUrl);
        
        if (!response.ok) {
          const errorData = await response.json();
          return NextResponse.json(errorData, { status: response.status });
        }
        
        const data = await response.json();
        const content = data.content;
        const book = data.book;
        
        if (!content || content.trim().length === 0) {
          return NextResponse.json(
            { error: 'Book content is empty or unavailable' },
            { status: 404 }
          );
        }
        
        // For external books, extract actual story content (skip preface/metadata)
        let context = content
        
        // Handle Google Books preview limitations
        if (source === 'googlebooks') {
          // Google Books only provides metadata and description - no full text
          const previewWarning = "\n\n[IMPORTANT: This is a Google Books preview containing only metadata and description. Full text content is not available through Google Books API due to copyright restrictions. For detailed text analysis, please use books from Project Gutenberg, Open Library, or Standard Ebooks sources.]";
          
          return NextResponse.json({
            id: book.id,
            title: book.title,
            author: book.author,
            cached: false,
            external: true,
            query,
            context: content + previewWarning,
            source: book.source,
            wordCount: content?.split(/\s+/).length || 0,
            isPreviewOnly: true,
            limitationWarning: "Google Books provides only metadata and description - no full text available"
          });
        }
        
        // Helper function to find the start of the actual story
        const findStoryStart = (text: string): number => {
          const patterns = [
            /^Chapter\s+1/im,                    // "Chapter 1" 
            /^Chapter\s+I/im,                    // "Chapter I"
            /^\s*1\s*$/m,                       // Standalone "1" (chapter number)
            /^CHAPTER\s+1/im,                   // "CHAPTER 1"
            /^CHAPTER\s+I/im,                   // "CHAPTER I"
            /\*\*\*\s*START OF THE PROJECT GUTENBERG/im, // End of header marker
            /\*\*\*\s*END OF THE PROJECT GUTENBERG EBOOK/im // Before footer
          ];
          
          for (const pattern of patterns) {
            const match = text.match(pattern);
            if (match && match.index !== undefined) {
              return match.index;
            }
          }
          
          // Fallback: skip first 20% of text (usually contains preface/metadata)
          return Math.floor(text.length * 0.2);
        };
        
        // Helper function to find the end of the actual story (before appendices/notes)
        const findStoryEnd = (text: string): number => {
          const endPatterns = [
            /\*\*\*\s*END OF THE PROJECT GUTENBERG/im,
            /^End of Project Gutenberg/im,
            /^APPENDIX/im,
            /^NOTES/im,
            /^BIBLIOGRAPHY/im,
            /^INDEX/im
          ];
          
          for (const pattern of endPatterns) {
            const match = text.match(pattern);
            if (match && match.index !== undefined) {
              return match.index;
            }
          }
          
          return text.length;
        };
        
        // Extract the main story content
        const storyStart = findStoryStart(content);
        const storyEnd = findStoryEnd(content);
        const storyContent = content.slice(storyStart, storyEnd);
        
        if (query && storyContent) {
          // Smart context extraction for external books
          const sentences = storyContent.split(/[.!?]+/)
            .map((s: string) => s.trim())
            .filter((s: string) => s.length > 10); // Filter out very short fragments
          
          // Find sentences that match the query
          const queryWords = query.toLowerCase().split(/\s+/);
          const relevantSentences = sentences
            .map((sentence: string) => ({
              text: sentence,
              score: queryWords.reduce((score: number, word: string) => {
                return score + (sentence.toLowerCase().includes(word) ? 1 : 0);
              }, 0)
            }))
            .filter((item: any) => item.score > 0) // Only sentences with query matches
            .sort((a: any, b: any) => b.score - a.score) // Sort by relevance
            .slice(0, 15) // Take top 15 most relevant sentences
            .map((item: any) => item.text)
            .join('. ');
          
          if (relevantSentences.length > 50) { // Only use if we found substantial content
            context = relevantSentences;
          } else {
            // Fallback: take first part of story if query matching fails
            const words = storyContent.split(/\s+/);
            context = words.slice(0, maxWords).join(' ');
          }
          
          // Truncate to maxWords if needed
          const words = context.split(/\s+/);
          if (words.length > maxWords) {
            context = words.slice(0, maxWords).join(' ') + '...';
          }
        } else if (!query && storyContent) {
          // If no query, return first portion of the actual story (not preface)
          const words = storyContent.split(/\s+/);
          if (words.length > maxWords) {
            context = words.slice(0, maxWords).join(' ') + '...';
          } else {
            context = storyContent;
          }
        }
        
        // Check if we should cache this external book
        const shouldCache = searchParams.get('cache') === 'true';
        
        if (shouldCache && content && content.length > 1000) {
          // Process and cache the external book
          console.log(`Caching external book ${id}...`);
          
          try {
            // Import content chunker
            const { enhancedContentChunker } = await import('@/lib/content-chunker-enhanced');
            
            // Extract chapters if possible - using the expected format
            const chapters = [];
            const chapterRegex = /^(Chapter\s+\d+|Chapter\s+[IVXLCDM]+|CHAPTER\s+\d+|CHAPTER\s+[IVXLCDM]+)/gim;
            let chapterMatch;
            let lastIndex = 0;
            let chapterOrder = 0;
            
            const matches = [];
            while ((chapterMatch = chapterRegex.exec(content)) !== null) {
              matches.push({
                title: chapterMatch[0],
                index: chapterMatch.index
              });
            }
            
            // Create chapter objects with content
            for (let i = 0; i < matches.length; i++) {
              const start = matches[i].index;
              const end = i < matches.length - 1 ? matches[i + 1].index : content.length;
              const chapterContent = content.slice(start, end);
              
              chapters.push({
                title: matches[i].title,
                content: chapterContent,
                order: chapterOrder++
              });
            }
            
            // If no chapters found, treat whole content as one chapter
            if (chapters.length === 0) {
              chapters.push({
                title: 'Full Text',
                content: content,
                order: 0
              });
            }
            
            // Create chunks
            const chunks = await enhancedContentChunker.chunkAndIndex(
              id,
              content,
              chapters
            );
            
            // Cache the content
            const cachedContent = {
              bookId: id,
              title: book.title,
              author: book.author,
              chunks,
              totalChunks: chunks.length,
              metadata: {
                source: book.source,
                externalId: bookId,
                cached: new Date().toISOString()
              },
              lastProcessed: new Date(),
              indexed: true
            };
            
            await bookCacheService.cacheContent(cachedContent);
            console.log(`External book ${id} cached with ${chunks.length} chunks`);
            
            // Return with semantic search if query provided
            if (query) {
              const relevantChunks = await bookCacheService.findRelevantCachedChunks(
                id,
                query,
                maxChunks
              );
              
              const semanticContext = relevantChunks.length > 0 
                ? bookCacheService.createContextFromChunks(relevantChunks, maxWords)
                : context;
              
              return NextResponse.json({
                id: book.id,
                title: book.title,
                author: book.author,
                cached: true,
                external: true,
                query,
                context: semanticContext,
                source: book.source,
                wordCount: content?.split(/\s+/).length || 0,
                characterCount: content?.length || 0,
                relevantChunks: relevantChunks.length,
                message: 'Book cached and indexed for semantic search'
              });
            }
          } catch (cacheError) {
            console.error('Failed to cache external book:', cacheError);
            // Continue with regular response if caching fails
          }
        }
        
        return NextResponse.json({
          id: book.id,
          title: book.title,
          author: book.author,
          cached: false,
          external: true,
          query,
          context,
          source: book.source,
          wordCount: content?.split(/\s+/).length || 0,
          characterCount: content?.length || 0,
          canCache: content && content.length > 1000,
          cacheHint: content && content.length > 1000 ? 'Add ?cache=true to enable semantic search' : undefined
        })
        
      } catch (error) {
        console.error('Error fetching external book:', error)
        return NextResponse.json(
          { error: 'Failed to fetch external book content' },
          { status: 500 }
        )
      }
    }

    // Check if book is cached
    const isCached = await bookCacheService.isBookCached(id)
    
    if (!isCached) {
      console.log(`Book ${id} not cached, checking processing status...`)
      
      // Check if currently being processed
      const processingStatus = bookProcessorService.getProcessingStatus(id)
      
      if (processingStatus) {
        return NextResponse.json({
          cached: false,
          processing: true,
          status: processingStatus,
          message: 'Book is being processed. Please try again in a few moments.'
        })
      }

      // Check if book exists and trigger background processing
      const book = await prisma.book.findUnique({
        where: { id },
        select: { id: true, title: true, filename: true }
      })

      if (!book) {
        return NextResponse.json(
          { error: 'Book not found' },
          { status: 404 }
        )
      }

      if (!book.filename) {
        return NextResponse.json(
          { error: 'No file associated with this book' },
          { status: 404 }
        )
      }

      // Start background processing
      console.log(`Starting background processing for book: ${book.title}`)
      bookProcessorService.processBookBackground(id)

      return NextResponse.json({
        cached: false,
        processing: true,
        message: 'Book processing started. Please try again in a few moments.',
        bookTitle: book.title
      })
    }

    // Get cached content
    console.log(`Loading cached content for book ${id}`)
    const cachedContent = await bookCacheService.getCachedContent(id)
    
    if (!cachedContent) {
      return NextResponse.json(
        { error: 'Failed to load cached content' },
        { status: 500 }
      )
    }

    // If no query, return basic info
    if (!query) {
      return NextResponse.json({
        id: cachedContent.bookId,
        title: cachedContent.title,
        author: cachedContent.author,
        cached: true,
        totalChunks: cachedContent.totalChunks,
        lastProcessed: cachedContent.lastProcessed,
        metadata: cachedContent.metadata,
        chunks: cachedContent.chunks.slice(0, maxChunks)
      })
    }

    // Find relevant chunks for the query
    console.log(`Finding relevant chunks for query: "${query}"`)
    const relevantChunks = await bookCacheService.findRelevantCachedChunks(
      id,
      query,
      maxChunks
    )

    // Create context from relevant chunks
    const context = relevantChunks.length > 0 
      ? bookCacheService.createContextFromChunks(relevantChunks, maxWords)
      : null

    console.log(`Found ${relevantChunks.length} relevant chunks, context length: ${context?.length || 0}`)

    return NextResponse.json({
      id: cachedContent.bookId,
      title: cachedContent.title,
      author: cachedContent.author,
      cached: true,
      query,
      relevantChunks: relevantChunks.length,
      totalChunks: cachedContent.totalChunks,
      context,
      chunks: relevantChunks,
      lastProcessed: cachedContent.lastProcessed,
      metadata: cachedContent.metadata
    })

  } catch (error) {
    console.error('Error in fast content fetch:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST endpoint to trigger processing
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { action } = await request.json()

    // Get user from Supabase auth
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    switch (action) {
      case 'process':
        // Force processing even if cached
        try {
          await bookProcessorService.processBook(id)
          return NextResponse.json({ 
            success: true, 
            message: 'Book processed successfully' 
          })
        } catch (error) {
          return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Processing failed' },
            { status: 500 }
          )
        }

      case 'clear-cache':
        await bookCacheService.clearBookCache(id)
        return NextResponse.json({ 
          success: true, 
          message: 'Cache cleared successfully' 
        })

      case 'status':
        const status = bookProcessorService.getProcessingStatus(id)
        const isCached = await bookCacheService.isBookCached(id)
        return NextResponse.json({ 
          cached: isCached,
          processing: status,
          needsProcessing: await bookProcessorService.needsProcessing(id)
        })

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('Error in book processing action:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}