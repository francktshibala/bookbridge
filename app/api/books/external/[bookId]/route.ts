import { NextRequest, NextResponse } from 'next/server';
import { gutenbergAPI } from '@/lib/book-sources/gutenberg-api';
import { openLibraryAPI } from '@/lib/book-sources/openlibrary-api';
import { standardEbooksAPI } from '@/lib/book-sources/standardebooks-api';
import { googleBooksAPI } from '@/lib/book-sources/google-books-api';
import type { ExternalBook } from '@/types/book-sources';

// Import vector service for semantic search
import { vectorService } from '@/lib/vector/vector-service';
import { ContentChunk } from '@/lib/content-chunker';

// Simple in-memory cache for external book content
const contentCache = new Map<string, { content: any; timestamp: number; indexed?: boolean }>();
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

// In-memory chunk cache for external books
const chunkCache = new Map<string, ContentChunk[]>();

// Helper function to fetch Standard Ebooks content (EPUB to text)
async function fetchStandardEbooksContent(book: ExternalBook): Promise<string> {
  try {
    // For now, return a placeholder since EPUB parsing requires additional libraries
    // In a production environment, you would use libraries like epub2txt or node-epub
    console.log(`Fetching Standard Ebooks content from: ${book.downloadUrl}`);
    
    // Try to fetch the EPUB file and extract text
    // This is a simplified approach - in reality you'd need proper EPUB parsing
    if (!book.downloadUrl) {
      throw new Error('No download URL available for this book');
    }
    
    const response = await fetch(book.downloadUrl, {
      signal: AbortSignal.timeout(30000) // 30 second timeout
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch EPUB: ${response.statusText}`);
    }
    
    // For demonstration purposes, we'll return a sample text
    // In production, you would parse the EPUB file to extract text content
    const sampleContent = `
${book.title}
by ${book.author}

This is a premium formatted ebook from Standard Ebooks.

${book.description || 'No description available.'}

[Note: This is a demonstration. In production, the full book content would be extracted from the EPUB file using proper EPUB parsing libraries like epub2txt, node-epub, or similar tools.]

The book "${book.title}" is available in multiple formats from Standard Ebooks, including EPUB, AZW3, and KEPUB formats. Standard Ebooks provides carefully proofread public domain texts with professional typography and formatting.
    `.trim();
    
    return sampleContent;
    
  } catch (error) {
    console.error('Error fetching Standard Ebooks content:', error);
    throw error;
  }
}

// Helper function to fetch Open Library content from Internet Archive
async function fetchOpenLibraryContent(book: ExternalBook): Promise<string> {
  try {
    // Extract Internet Archive ID from the download URL
    if (!book.downloadUrl) {
      throw new Error('No download URL available for this Open Library book');
    }
    const iaId = book.downloadUrl.split('/').pop();
    
    if (!iaId) {
      throw new Error('No Internet Archive ID found');
    }
    
    // Try different text formats from Internet Archive
    const textFormats = [
      `https://archive.org/download/${iaId}/${iaId}_djvu.txt`,
      `https://archive.org/download/${iaId}/${iaId}.txt`,
      `https://archive.org/stream/${iaId}/${iaId}_djvu.txt`
    ];
    
    for (const url of textFormats) {
      try {
        console.log(`Trying to fetch from: ${url}`);
        const response = await fetch(url, {
          signal: AbortSignal.timeout(30000) // 30 second timeout
        });
        
        if (response.ok) {
          const content = await response.text();
          if (content && content.trim().length > 100) {
            return content;
          }
        }
      } catch (error) {
        console.log(`Failed to fetch from ${url}:`, error);
        continue;
      }
    }
    
    // If no text format works, try to get metadata and find alternative formats
    const metadataUrl = `https://archive.org/metadata/${iaId}`;
    const metadataResponse = await fetch(metadataUrl);
    
    if (metadataResponse.ok) {
      const metadata = await metadataResponse.json();
      const files = metadata.files || [];
      
      // Look for text files in metadata
      const textFile = files.find((file: any) => 
        file.name.endsWith('.txt') || file.name.endsWith('_djvu.txt')
      );
      
      if (textFile) {
        const fileUrl = `https://archive.org/download/${iaId}/${textFile.name}`;
        const response = await fetch(fileUrl, {
          signal: AbortSignal.timeout(30000)
        });
        
        if (response.ok) {
          return await response.text();
        }
      }
    }
    
    throw new Error('No text content available from Internet Archive');
    
  } catch (error) {
    console.error('Error fetching Open Library content:', error);
    throw error;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ bookId: string }> }
) {
  try {
    const { bookId } = await params;
    
    if (!bookId) {
      return NextResponse.json(
        { error: 'Book ID is required' },
        { status: 400 }
      );
    }

    // Check cache first
    const cachedData = contentCache.get(bookId);
    const now = Date.now();
    
    if (cachedData && (now - cachedData.timestamp) < CACHE_DURATION) {
      console.log(`Returning cached content for book ${bookId}`);
      return NextResponse.json(cachedData.content, {
        headers: {
          'Cache-Control': 'public, max-age=1800', // 30 minutes
          'X-Cache': 'HIT'
        }
      });
    }

    // Parse external book ID (format: "gutenberg-123" or "openlibrary-OL123W")
    const [source, ...idParts] = bookId.split('-');
    const id = idParts.join('-'); // Handle IDs that might contain dashes
    
    if (!['gutenberg', 'openlibrary', 'standardebooks', 'googlebooks'].includes(source) || !id) {
      return NextResponse.json(
        { error: 'Invalid book ID format. Expected format: source-id (e.g., gutenberg-123, openlibrary-OL123W, standardebooks-author-title, googlebooks-abc123)' },
        { status: 400 }
      );
    }

    let externalBook: ExternalBook | null = null;
    let content: string = '';

    if (source === 'gutenberg') {
      const numericId = parseInt(id);
      if (isNaN(numericId)) {
        return NextResponse.json(
          { error: 'Invalid Gutenberg book ID: must be numeric' },
          { status: 400 }
        );
      }

      // Get book metadata first
      const bookData = await gutenbergAPI.getBook(numericId);
      
      if (!bookData) {
        return NextResponse.json(
          { error: 'Book not found' },
          { status: 404 }
        );
      }

      // Transform to our format to get download URL
      externalBook = gutenbergAPI.transformToExternalBook(bookData);
      
      if (!externalBook) {
        return NextResponse.json(
          { error: 'Book content not available (no text format found)' },
          { status: 404 }
        );
      }

      // Fetch the actual book content
      if (!externalBook.downloadUrl) {
        throw new Error('No download URL available for this Gutenberg book');
      }
      console.log(`Fetching content for Gutenberg book ${bookId} from ${externalBook.downloadUrl}`);
      content = await gutenbergAPI.fetchBookContent(externalBook.downloadUrl);
      
    } else if (source === 'openlibrary') {
      // Get book metadata from Open Library
      const bookData = await openLibraryAPI.getBook(id);
      
      if (!bookData) {
        return NextResponse.json(
          { error: 'Book not found in Open Library' },
          { status: 404 }
        );
      }

      // Transform to our format
      externalBook = openLibraryAPI.transformToExternalBook(bookData);
      
      if (!externalBook) {
        return NextResponse.json(
          { error: 'Book content not available from Open Library' },
          { status: 404 }
        );
      }

      // Fetch content from Internet Archive
      console.log(`Fetching content for Open Library book ${bookId} from Internet Archive`);
      content = await fetchOpenLibraryContent(externalBook);
      
    } else if (source === 'standardebooks') {
      // Get book metadata from Standard Ebooks
      const bookData = await standardEbooksAPI.getBook(id);
      
      if (!bookData) {
        return NextResponse.json(
          { error: 'Book not found in Standard Ebooks' },
          { status: 404 }
        );
      }

      // Transform to our format
      externalBook = standardEbooksAPI.transformToExternalBook(bookData);
      
      if (!externalBook) {
        return NextResponse.json(
          { error: 'Book content not available from Standard Ebooks' },
          { status: 404 }
        );
      }

      // Fetch content (EPUB parsing placeholder)
      console.log(`Fetching content for Standard Ebooks book ${bookId}`);
      content = await fetchStandardEbooksContent(externalBook);
      
    } else if (source === 'googlebooks') {
      // Get book metadata and preview content from Google Books
      const bookData = await googleBooksAPI.getBook(`googlebooks-${id}`);
      
      if (!bookData) {
        return NextResponse.json(
          { error: 'Book not found in Google Books' },
          { status: 404 }
        );
      }

      externalBook = bookData;
      
      // Get preview content (metadata only for Google Books)
      const previewContent = await googleBooksAPI.getPreviewContent(`googlebooks-${id}`);
      
      if (!previewContent) {
        return NextResponse.json(
          { error: 'Google Books preview content not available' },
          { status: 404 }
        );
      }

      content = previewContent;
    }
    
    if (!externalBook) {
      return NextResponse.json(
        { error: 'Failed to process book metadata' },
        { status: 500 }
      );
    }
    
    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { error: 'Book content is empty or unavailable' },
        { status: 404 }
      );
    }

    // Prepare response data
    const responseData = {
      book: externalBook,
      content,
      wordCount: content.split(/\s+/).filter(word => word.length > 0).length,
      characterCount: content.length,
      fetchedAt: new Date().toISOString()
    };

    // Cache the response
    contentCache.set(bookId, {
      content: responseData,
      timestamp: now
    });

    // Clean up old cache entries (simple cleanup)
    if (contentCache.size > 100) {
      const entries = Array.from(contentCache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      // Remove oldest 20 entries
      for (let i = 0; i < 20; i++) {
        contentCache.delete(entries[i][0]);
      }
    }
    
    // Return book metadata and content
    return NextResponse.json(responseData, {
      headers: {
        'Cache-Control': 'public, max-age=1800', // 30 minutes
        'X-Cache': 'MISS'
      }
    });

  } catch (error) {
    console.error('Error fetching external book:', error);
    
    // Provide more specific error messages
    let errorMessage = 'Failed to fetch book content';
    let statusCode = 500;
    
    if (error instanceof Error) {
      if (error.message.includes('not found') || error.message.includes('404')) {
        errorMessage = 'Book not found or unavailable';
        statusCode = 404;
      } else if (error.message.includes('network') || error.message.includes('fetch')) {
        errorMessage = 'Network error while fetching book content';
        statusCode = 502;
      } else if (error.message.includes('timeout')) {
        errorMessage = 'Request timeout while fetching book content';
        statusCode = 504;
      }
    }
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: statusCode }
    );
  }
}