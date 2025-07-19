import { NextRequest, NextResponse } from 'next/server';
import { aiService } from '@/lib/ai';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    console.log('AI API called');
    const { query, bookId, bookContext } = await request.json();
    console.log('Query:', query);
    console.log('BookId:', bookId);
    console.log('BookContext:', bookContext);

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Query is required and must be a string' },
        { status: 400 }
      );
    }

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
    console.log('User authenticated:', user.id);

    // If bookId is provided, fetch relevant book content
    let enrichedBookContext = bookContext;
    if (bookId) {
      try {
        console.log('Fetching book content for AI context...');
        
        // Fetch relevant book chunks based on the query
        const contentResponse = await Promise.race([
          fetch(
            `${process.env.NEXT_PUBLIC_URL || 'http://localhost:3001'}/api/books/${bookId}/content?query=${encodeURIComponent(query)}&chunks=true`,
            {
              headers: {
                'Cookie': request.headers.get('cookie') || ''
              }
            }
          ),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Content fetch timeout')), 10000)
          )
        ]) as Response;
        
        if (contentResponse.ok) {
          const contentData = await contentResponse.json();
          
          // If we have relevant content context, use it
          if (contentData.context) {
            enrichedBookContext = `Book: ${contentData.title} by ${contentData.author}\n\nRelevant excerpts:\n${contentData.context}`;
            console.log('Book content loaded successfully, context length:', enrichedBookContext.length);
          } else if (contentData.chunks && contentData.chunks.length > 0) {
            // Fallback to first few chunks if no specific context
            const context = contentData.chunks
              .slice(0, 3)
              .map((chunk: any) => chunk.content)
              .join('\n\n');
            enrichedBookContext = `Book: ${contentData.title} by ${contentData.author}\n\nExcerpts:\n${context}`;
          }
        } else {
          console.warn('Failed to fetch book content:', contentResponse.status);
        }
      } catch (error) {
        console.error('Error fetching book content:', error);
        // Continue with original bookContext if fetch fails
      }
    }

    // Query AI service
    console.log('Calling AI service...');
    const response = await aiService.query(query, {
      userId: user.id,
      bookId,
      bookContext: enrichedBookContext,
      maxTokens: 500
    });
    console.log('AI response received:', response);

    return NextResponse.json({ 
      response: response.content,
      usage: response.usage,
      cost: response.cost,
      model: response.model
    });

  } catch (error) {
    console.error('AI API error:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    if (error instanceof Error) {
      // Handle specific error types
      if (error.message.includes('limit exceeded')) {
        return NextResponse.json(
          { error: error.message },
          { status: 429 }
        );
      }
      
      if (error.message.includes('temporarily unavailable')) {
        return NextResponse.json(
          { error: 'AI service temporarily unavailable' },
          { status: 503 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get user from Supabase auth
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get usage statistics
    const stats = await aiService.getUsageStats(user.id);

    return NextResponse.json({ stats });

  } catch (error) {
    console.error('Usage stats error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}