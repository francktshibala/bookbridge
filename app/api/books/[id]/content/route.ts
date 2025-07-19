import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { prisma } from '@/lib/prisma';
import { contentExtractor } from '@/lib/content-extractor';
import { contentChunker } from '@/lib/content-chunker';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    console.log('Fetching book content for ID:', id);

    // Get user from Supabase auth
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('Auth error:', authError);
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get book metadata from database
    const book = await prisma.book.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        author: true,
        filename: true,
        fileSize: true,
        language: true,
        publicDomain: true
      }
    });

    if (!book) {
      return NextResponse.json(
        { error: 'Book not found' },
        { status: 404 }
      );
    }

    if (!book.filename) {
      return NextResponse.json(
        { error: 'No file associated with this book' },
        { status: 404 }
      );
    }

    // Create service role client for storage access to bypass RLS
    const storageSupabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    console.log('Downloading file from storage:', book.filename);
    const { data: fileData, error: downloadError } = await storageSupabase
      .storage
      .from('book-files')
      .download(book.filename);

    if (downloadError || !fileData) {
      console.error('Download error:', downloadError);
      return NextResponse.json(
        { error: 'Failed to retrieve book file' },
        { status: 500 }
      );
    }

    // Extract file type
    const fileType = book.filename.split('.').pop()?.toLowerCase() || 'txt';
    
    try {
      // Convert blob to buffer
      const arrayBuffer = await fileData.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      // Extract content using the content extractor
      const extractedContent = await contentExtractor.extract(buffer, fileType);
      
      // Check if we need to return chunks instead of full content
      const { searchParams } = new URL(request.url);
      const query = searchParams.get('query');
      const returnChunks = searchParams.get('chunks') === 'true';
      
      if (returnChunks || query) {
        // Create chunks from the extracted content
        const chunks = contentChunker.chunk(
          book.id,
          extractedContent.text,
          extractedContent.chapters,
          {
            maxChunkSize: 1500,
            overlapSize: 200,
            preserveSentences: true,
            preserveParagraphs: true
          }
        );
        
        // If there's a query, find relevant chunks
        const relevantChunks = query 
          ? contentChunker.findRelevantChunks(chunks, query, 5)
          : chunks.slice(0, 10); // Return first 10 chunks if no query
        
        // Create context for AI from relevant chunks
        const context = query 
          ? contentChunker.createContextFromChunks(relevantChunks, 3000)
          : null;
        
        return NextResponse.json({
          id: book.id,
          title: book.title,
          author: book.author,
          chunks: relevantChunks,
          context,
          totalChunks: chunks.length,
          contentType: fileType,
          fileSize: book.fileSize,
          language: extractedContent.metadata?.language || book.language,
          metadata: {
            ...extractedContent.metadata,
            originalFileSize: book.fileSize
          }
        });
      }
      
      // Return full content (for backward compatibility)
      return NextResponse.json({
        id: book.id,
        title: book.title,
        author: book.author,
        content: extractedContent.text,
        chapters: extractedContent.chapters,
        contentType: fileType,
        fileSize: book.fileSize,
        language: extractedContent.metadata?.language || book.language,
        metadata: {
          ...extractedContent.metadata,
          originalFileSize: book.fileSize
        }
      });
    } catch (extractionError) {
      console.error('Content extraction error:', extractionError);
      
      // Fallback for text files
      if (fileType === 'txt') {
        const text = await fileData.text();
        return NextResponse.json({
          id: book.id,
          title: book.title,
          author: book.author,
          content: text,
          contentType: 'text',
          fileSize: book.fileSize,
          language: book.language
        });
      }
      
      return NextResponse.json({
        id: book.id,
        title: book.title,
        author: book.author,
        content: null,
        contentType: fileType,
        fileSize: book.fileSize,
        language: book.language,
        error: `Failed to extract content: ${extractionError instanceof Error ? extractionError.message : 'Unknown error'}`
      });
    }

  } catch (error) {
    console.error('Book content API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}