import { NextRequest, NextResponse } from 'next/server';
import { aiService } from '@/lib/ai';
import { multiAgentService } from '@/lib/ai/multi-agent-service';
import { createClient } from '@/lib/supabase/server';
import { learningProfileService } from '@/lib/learning-profile';
import { crossBookConnectionsService } from '@/lib/cross-book-connections';

export async function POST(request: NextRequest) {
  try {
    console.log('AI API called');
    const { query, bookId, bookContext, responseMode = 'detailed' } = await request.json();
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
        
        // Implement retry logic with shorter timeouts for cached content
        let contentResponse: Response | null = null;
        let lastError: Error | null = null;
        const maxRetries = 2; // Reduced retries since we have caching
        const baseTimeout = 10000; // 10 seconds base timeout
        
        for (let attempt = 0; attempt < maxRetries; attempt++) {
          try {
            console.log(`Attempt ${attempt + 1}/${maxRetries} to fetch book content...`);
            
            // Use fast content route with shorter timeout
            const timeout = 10000; // Fixed 10 second timeout
            
            // Auto-detect the base URL for internal API calls
            const host = request.headers.get('host');
            const baseUrl = process.env.NEXT_PUBLIC_URL || 
                           (host ? 
                            `http://${host}` : 
                            'http://localhost:3000');
            
            contentResponse = await Promise.race([
              fetch(
                `${baseUrl}/api/books/${bookId}/content-fast?query=${encodeURIComponent(query)}&maxChunks=5&maxWords=3000`,
                {
                  headers: {
                    'Cookie': request.headers.get('cookie') || ''
                  }
                }
              ),
              new Promise<Response>((_, reject) => 
                setTimeout(() => reject(new Error(`Content fetch timeout after ${timeout/1000}s`)), timeout)
              )
            ]) as Response;
            
            // If successful, break out of retry loop
            if (contentResponse.ok) {
              console.log(`Successfully fetched content on attempt ${attempt + 1}`);
              break;
            }
            
            // If not ok but not a server error, don't retry
            if (contentResponse.status < 500) {
              console.warn(`Non-retryable error: ${contentResponse.status}`);
              break;
            }
            
          } catch (error) {
            lastError = error as Error;
            console.error(`Attempt ${attempt + 1} failed:`, error);
            
            // If not the last attempt, wait before retrying (shorter delays)
            if (attempt < maxRetries - 1) {
              const backoffDelay = 500 * (attempt + 1); // 500ms, 1s
              console.log(`Waiting ${backoffDelay/1000}s before retry...`);
              await new Promise(resolve => setTimeout(resolve, backoffDelay));
            }
          }
        }
        
        if (contentResponse && contentResponse.ok) {
          const contentData = await contentResponse.json();
          
          // Handle fast content response
          if (contentData.cached === false && contentData.processing) {
            console.log('Book is being processed, using fallback context');
            enrichedBookContext = `Book: ${contentData.bookTitle || 'Unknown'}\n\nNote: Book content is being processed in the background. Using basic information for now.`;
          } else if (contentData.context) {
            enrichedBookContext = `Book: ${contentData.title} by ${contentData.author}\n\nRelevant excerpts:\n${contentData.context}`;
            console.log('Book content loaded successfully from cache, context length:', enrichedBookContext.length);
          } else if (contentData.chunks && contentData.chunks.length > 0) {
            // Fallback to first few chunks if no specific context
            const context = contentData.chunks
              .slice(0, 3)
              .map((chunk: any) => chunk.content)
              .join('\n\n');
            enrichedBookContext = `Book: ${contentData.title} by ${contentData.author}\n\nExcerpts:\n${context}`;
          }
        } else {
          // Provide fallback context with book metadata
          console.warn('Failed to fetch book content after all retries, using fallback');
          enrichedBookContext = `${bookContext}\n\n[Note: Full book content is temporarily unavailable. Please try your question again, or ask about the book's general themes, author, or context based on the title.]`;
        }
      } catch (error) {
        console.error('Error fetching book content:', error);
        // Continue with enhanced bookContext if fetch fails
        enrichedBookContext = `${bookContext}\n\n[Note: Unable to access full book content at this time. I can still help with general questions about the book based on its title and author.]`;
      }
    }

    // Get user learning profile for personalized responses
    console.log('Getting user learning profile...');
    let adaptivePrompt = '';
    try {
      adaptivePrompt = await learningProfileService.getAdaptivePrompt(user.id, query);
      console.log('Adaptive prompt generated:', adaptivePrompt ? 'Yes' : 'No');
    } catch (error) {
      console.error('Learning profile error (non-blocking):', error instanceof Error ? error.message : String(error));
      adaptivePrompt = ''; // Continue without adaptive prompt
    }

    // Get cross-book connections for contextual learning
    console.log('Getting cross-book connections...');
    let crossBookContext = '';
    if (bookId) {
      try {
        const connections = await crossBookConnectionsService.getConnectionsForCurrentQuestion(user.id, query, bookId);
        console.log('Cross-book analysis result:', {
          relevantConnections: connections.relevantConnections.length,
          suggestedContext: connections.suggestedContext.length,
          contexts: connections.suggestedContext
        });
        if (connections.suggestedContext.length > 0) {
          crossBookContext = `\n\nCross-Book Context:\n${connections.suggestedContext.join('\n')}`;
          console.log('Cross-book connections found:', connections.suggestedContext.length);
        }
      } catch (error) {
        console.error('Error getting cross-book connections (non-blocking):', error instanceof Error ? error.message : String(error));
        crossBookContext = ''; // Continue without cross-book context
      }
    }

    // Determine whether to use multi-agent system
    const useMultiAgent = process.env.ENABLE_MULTI_AGENT === 'true' || 
                          query.toLowerCase().includes('analyze') ||
                          query.toLowerCase().includes('compare') ||
                          query.toLowerCase().includes('explain') ||
                          query.toLowerCase().includes('significance') ||
                          query.toLowerCase().includes('meaning') ||
                          query.toLowerCase().includes('mean') ||
                          query.toLowerCase().includes('interpret') ||
                          query.toLowerCase().includes('discuss') ||
                          query.toLowerCase().includes('theme');

    console.log('Using multi-agent system:', useMultiAgent);
    console.log('Response mode:', responseMode);

    // Determine token limits based on response mode
    const maxTokens = responseMode === 'brief' ? 300 : 1500;

    let response: any;
    if (useMultiAgent) {
      console.log('Calling multi-agent AI service...');
      const enhancedQuery = adaptivePrompt ? `${adaptivePrompt}${query}` : query;
      response = await multiAgentService.processQuery(enhancedQuery, {
        userId: user.id,
        bookId,
        bookContext: enrichedBookContext + crossBookContext,
        maxTokens,
        responseMode
      });
      console.log('Multi-agent response received:', response);
    } else {
      console.log('Calling standard AI service...');
      const enhancedQuery = adaptivePrompt ? `${adaptivePrompt}${query}` : query;
      response = await aiService.query(enhancedQuery, {
        userId: user.id,
        bookId,
        bookContext: enrichedBookContext + crossBookContext,
        maxTokens,
        responseMode
      });
      console.log('Standard AI response received:', response);
    }

    return NextResponse.json({ 
      response: response.content,
      usage: response.usage,
      cost: response.cost,
      model: response.model,
      multiAgent: useMultiAgent,
      ...(useMultiAgent && {
        agentResponses: {
          research: response.research?.content,
          analysis: response.analysis?.content,
          citations: response.citations?.content
        }
      })
    });

  } catch (error) {
    console.error('AI API error:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    // Log environment variable status for debugging
    console.error('Environment check:', {
      hasAnthropicKey: !!process.env.ANTHROPIC_API_KEY,
      hasOpenAIKey: !!process.env.OPENAI_API_KEY,
      anthropicKeyLength: process.env.ANTHROPIC_API_KEY?.length || 0
    });
    
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
      
      // Return more specific error for debugging
      return NextResponse.json(
        { 
          error: 'AI service error',
          message: error.message,
          details: process.env.NODE_ENV === 'development' ? error.message : undefined
        },
        { status: 500 }
      );
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