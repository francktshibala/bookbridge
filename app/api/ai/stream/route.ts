import { NextRequest, NextResponse } from 'next/server';
import { aiService } from '@/lib/ai';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const { query, bookId, bookContext } = await request.json();

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
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Create streaming response
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const encoder = new TextEncoder();
          
          // Send initial message
          controller.enqueue(encoder.encode('data: {"type": "start"}\n\n'));

          // Stream AI response
          const aiStream = aiService.queryStream(query, {
            userId: user.id,
            bookId,
            bookContext,
            maxTokens: 500
          });

          let fullContent = '';
          
          for await (const chunk of aiStream) {
            fullContent += chunk;
            
            // Send chunk to client
            const data = JSON.stringify({
              type: 'content',
              content: chunk,
              fullContent
            });
            
            controller.enqueue(encoder.encode(`data: ${data}\n\n`));
          }

          // Send completion message
          controller.enqueue(encoder.encode('data: {"type": "complete"}\n\n'));
          controller.close();

        } catch (error) {
          console.error('Streaming error:', error);
          
          const errorData = JSON.stringify({
            type: 'error',
            error: error instanceof Error ? error.message : 'Unknown error'
          });
          
          controller.enqueue(new TextEncoder().encode(`data: ${errorData}\n\n`));
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    });

  } catch (error) {
    console.error('Stream setup error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}