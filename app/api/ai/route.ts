import { NextRequest, NextResponse } from 'next/server';
import { aiService } from '@/lib/ai';
import { multiAgentService, TutoringResponse } from '@/lib/ai/multi-agent-service';
import { createClient } from '@/lib/supabase/server';
import { learningProfileService } from '@/lib/learning-profile';
import { crossBookConnectionsService } from '@/lib/cross-book-connections';
import { UsageTrackingMiddleware } from '@/lib/middleware/usage-tracking';
import { conversationService } from '@/lib/services/conversation-service';
import { queryIntentClassifier } from '@/lib/ai/query-intent-classifier';
import { dynamicResponseAdaptation } from '@/lib/services/dynamic-response-adaptation';
import { vocabularySimplifier } from '@/lib/ai/vocabulary-simplifier';

// Helper function to extract key concepts from query and response
function extractConcepts(query: string, response: string): string[] {
  const concepts: string[] = [];
  
  // Common literary concepts to look for
  const literaryConcepts = [
    'symbolism', 'theme', 'character', 'plot', 'setting', 
    'metaphor', 'irony', 'foreshadowing', 'conflict', 'tone',
    'mood', 'perspective', 'motif', 'allegory', 'imagery'
  ];
  
  const combinedText = `${query} ${response}`.toLowerCase();
  
  literaryConcepts.forEach(concept => {
    if (combinedText.includes(concept)) {
      concepts.push(concept);
    }
  });
  
  return concepts;
}

export async function POST(request: NextRequest) {
  try {
    console.log('AI API called');
    const { query, bookId, bookContext, conversationId } = await request.json();
    console.log('Query:', query);
    console.log('BookId:', bookId);
    console.log('BookContext:', bookContext);
    console.log('ConversationId:', conversationId);

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

    // Check usage limits before processing
    const usageCheck = await UsageTrackingMiddleware.checkAndTrack(
      user.id, 
      bookId, 
      bookContext
    );

    if (!usageCheck.allowed) {
      console.log('Usage limit exceeded for user:', user.id, 'Reason:', usageCheck.reason);
      let message = usageCheck.reason || 'Usage limit exceeded';
      
      // Add helpful context for free users
      if (usageCheck.reason?.includes('monthly limit')) {
        message += ' Consider upgrading to Premium ($4/month) or Student ($2/month with .edu email) for unlimited access.';
      }

      return NextResponse.json({
        error: message,
        code: 'USAGE_LIMIT_EXCEEDED',
        remainingAnalyses: usageCheck.remainingAnalyses || 0,
        upgradeUrl: '/subscription/pricing'
      }, { status: 429 });
    }

    console.log('Usage check passed. Remaining analyses:', usageCheck.remainingAnalyses);

    // Initialize or retrieve conversation
    let conversation;
    let conversationContext = '';
    let conversationContextData = null;
    
    if (bookId) {
      try {
        // Find or create conversation for this book
        conversation = await conversationService.findOrCreateConversation(user.id, bookId);
        console.log('Conversation initialized:', conversation.id);

        // Get conversation context if there are previous messages
        if (conversation.messages.length > 0) {
          conversationContextData = await conversationService.getConversationContext(conversation.id);
          if (conversationContextData) {
            conversationContext = await conversationService.buildConversationPromptContext(conversationContextData);
            console.log('Loaded conversation context with', conversationContextData.messages.length, 'messages');
          }
        }

        // Store user query in conversation (without embedding for now)
        await conversationService.addMessage(conversation.id, {
          content: query,
          sender: 'user',
        });
      } catch (error) {
        console.error('Conversation management error (non-blocking):', error);
        // Continue without conversation tracking
      }
    }

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
            
            // Use fast content route with timeout (longer for external books)
            const isExternalBook = bookId.includes('-') && !bookId.match(/^[0-9a-f-]{36}$/);
            const timeout = isExternalBook ? 30000 : 10000; // 30s for external books, 10s for internal
            
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
            // Check if this is a Google Books preview with limitations
            if (contentData.isPreviewOnly && contentData.source === 'googlebooks') {
              enrichedBookContext = `Book: ${contentData.title} by ${contentData.author}\n\nGoogle Books Preview (Metadata Only):\n${contentData.context}\n\n[Note: This analysis is based on metadata and description only, as Google Books doesn't provide full text content. For detailed textual analysis, consider using the same book from Project Gutenberg, Open Library, or Standard Ebooks if available.]`;
            } else {
              enrichedBookContext = `Book: ${contentData.title} by ${contentData.author}\n\nRelevant excerpts:\n${contentData.context}`;
            }
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

    // Determine whether to use enhanced tutoring multi-agent system
    // Enable for most educational queries to provide better tutoring experience
    const useMultiAgent = process.env.ENABLE_MULTI_AGENT === 'true' || 
                          query.toLowerCase().includes('analyze') ||
                          query.toLowerCase().includes('compare') ||
                          query.toLowerCase().includes('explain') ||
                          query.toLowerCase().includes('significance') ||
                          query.toLowerCase().includes('meaning') ||
                          query.toLowerCase().includes('mean') ||
                          query.toLowerCase().includes('interpret') ||
                          query.toLowerCase().includes('discuss') ||
                          query.toLowerCase().includes('theme') ||
                          query.toLowerCase().includes('what does') ||
                          query.toLowerCase().includes('why does') ||
                          query.toLowerCase().includes('how does') ||
                          query.toLowerCase().includes('think') ||
                          query.toLowerCase().includes('feel') ||
                          query.toLowerCase().includes('important') ||
                          query.toLowerCase().includes('character') ||
                          query.toLowerCase().includes('understand') ||
                          query.toLowerCase().includes('symbol') ||
                          query.length > 10; // Most educational questions are longer than 10 characters

    console.log('Using multi-agent system:', useMultiAgent);
    
    // 🧠 DYNAMIC RESPONSE ADAPTATION - Get user's preferred response style
    let dynamicParams;
    try {
      dynamicParams = await dynamicResponseAdaptation.getAdaptedParameters(user.id);
      console.log('Dynamic adaptation parameters:', dynamicParams);
    } catch (error) {
      console.error('Error getting dynamic params (non-blocking):', error);
      dynamicParams = null;
    }
    
    // 🧠 INTELLIGENT RESPONSE LENGTH DETECTION (Claude AI Style)
    const queryIntent = await queryIntentClassifier.classifyQuery(query, conversationContextData || undefined);
    
    // Override with dynamic adaptation if available
    if (dynamicParams) {
      // Merge dynamic preferences with query intent
      if (dynamicParams.length === 'brief' && queryIntent.expectedLength !== 'brief') {
        queryIntent.expectedLength = 'brief'; // User prefers brief responses
      } else if (dynamicParams.length === 'detailed' && queryIntent.expectedLength === 'brief') {
        queryIntent.expectedLength = 'moderate'; // Compromise between user preference and query need
      }
      
      // Adjust complexity based on user history
      if (dynamicParams.complexity === 'simple') {
        queryIntent.complexity = 'simple';
      } else if (dynamicParams.complexity === 'advanced') {
        queryIntent.complexity = 'complex';
      }
    }
    
    // Map 'moderate' and 'simplified' to 'detailed' for backward compatibility with existing AI services
    const responseMode = (queryIntent.expectedLength === 'moderate' || queryIntent.expectedLength === 'simplified') 
      ? 'detailed' : queryIntent.expectedLength as 'brief' | 'detailed';
    const maxTokens = queryIntent.expectedLength === 'brief' ? 150 : 
                      queryIntent.expectedLength === 'moderate' ? 400 :
                      queryIntent.expectedLength === 'simplified' ? 300 : 800;
    
    console.log('Query Intent Analysis:', {
      type: queryIntent.type,
      expectedLength: queryIntent.expectedLength,
      complexity: queryIntent.complexity,
      confidence: queryIntent.confidence,
      reasoning: queryIntent.reasoning,
      maxTokens
    });

    // 🧠 Generate intelligent prompt based on query intent
    const intelligentPrompt = queryIntentClassifier.generateResponsePrompt(
      queryIntent, 
      query, 
      enrichedBookContext + crossBookContext + (conversationContext ? `\n\n${conversationContext}` : '')
    );
    
    // Add dynamic adaptation instructions if available
    let dynamicInstructions = '';
    if (dynamicParams) {
      dynamicInstructions = `\n\nUser Preference Adaptation:
- Preferred explanation style: ${dynamicParams.style} (use ${dynamicParams.style === 'examples' ? 'concrete examples' : 
  dynamicParams.style === 'analogies' ? 'relatable analogies' : 
  dynamicParams.style === 'step-by-step' ? 'step-by-step breakdowns' : 'direct explanations'})
- Response temperature: ${dynamicParams.temperature} (${dynamicParams.temperature < 0.5 ? 'be more consistent and focused' : 
  dynamicParams.temperature > 0.7 ? 'be more creative and exploratory' : 'balance consistency with creativity'})`;}


    let response: any;
    if (useMultiAgent) {
      console.log('Calling enhanced tutoring multi-agent service...');
      const enhancedQuery = adaptivePrompt ? `${adaptivePrompt}${intelligentPrompt}${dynamicInstructions}` : `${intelligentPrompt}${dynamicInstructions}`;
      response = await multiAgentService.processQuery(enhancedQuery, {
        userId: user.id,
        bookId,
        bookContext: enrichedBookContext + crossBookContext + (conversationContext ? `\n\n${conversationContext}` : ''),
        maxTokens,
        responseMode,
        conversationHistory: conversationContextData,
        temperature: dynamicParams?.temperature
      }) as TutoringResponse;
      console.log('Enhanced tutoring response received:', response);
    } else {
      console.log('Calling standard AI service with intelligent prompt...');
      const enhancedQuery = adaptivePrompt ? `${adaptivePrompt}${intelligentPrompt}${dynamicInstructions}` : `${intelligentPrompt}${dynamicInstructions}`;
      response = await aiService.query(enhancedQuery, {
        userId: user.id,
        bookId,
        bookContext: enrichedBookContext + crossBookContext + (conversationContext ? `\n\n${conversationContext}` : ''),
        maxTokens,
        responseMode,
        temperature: dynamicParams?.temperature
      });
      console.log('Standard AI response received:', response);
    }

    // Store AI response in conversation
    if (conversation && response?.content) {
      try {
        await conversationService.addMessage(conversation.id, {
          content: response.content,
          sender: 'assistant',
          tokensUsed: response.usage?.total_tokens,
          model: response.model,
          cost: response.cost
        });
        
        // Add episodic memory for significant moments
        if (query.toLowerCase().includes('mean') || 
            query.toLowerCase().includes('symbolize') || 
            query.toLowerCase().includes('theme') ||
            query.toLowerCase().includes('understand')) {
          await conversationService.addEpisodicMemory({
            conversationId: conversation.id,
            query: query,
            response: response.content.substring(0, 500), // Store first 500 chars
            bookPassage: enrichedBookContext.substring(0, 500),
            concepts: extractConcepts(query, response.content)
          });
        }
        
        // 🧠 DYNAMIC RESPONSE ADAPTATION - Record interaction for learning
        if (dynamicParams) {
          try {
            // Detect user reaction from the query (if it's a follow-up)
            let previousQuery = null;
            if (conversationContextData && conversationContextData.messages.length > 1) {
              const userMessages = conversationContextData.messages.filter(m => m.sender === 'user');
              if (userMessages.length > 1) {
                previousQuery = userMessages[userMessages.length - 2].content;
              }
            }
            
            const userReaction = await dynamicResponseAdaptation.detectUserReaction(
              query,
              previousQuery || undefined
            );
            
            await dynamicResponseAdaptation.recordInteraction({
              userId: user.id,
              conversationId: conversation.id,
              query: query,
              response: response.content,
              userReaction: userReaction,
              followUpQuery: !!previousQuery
            });
            
            console.log('Recorded interaction with reaction:', userReaction);
          } catch (error) {
            console.error('Failed to record dynamic adaptation (non-blocking):', error);
          }
        }
      } catch (error) {
        console.error('Failed to store conversation response (non-blocking):', error);
      }
    }

    // Track successful analysis in background
    if (usageCheck.shouldTrack && response?.content) {
      UsageTrackingMiddleware.trackSuccess(user.id, bookId, bookContext).catch(error => {
        console.error('Background usage tracking failed:', error);
      });
    }

    // Apply vocabulary simplification if needed
    let finalContent = response.content;
    if (queryIntent.expectedLength === 'simplified' || queryIntent.complexity === 'simple') {
      try {
        const extractedAge = queryIntent.extractedAge;
        if (bookContext) {
          // Context-aware simplification for book discussions
          finalContent = vocabularySimplifier.simplifyWithContext(
            response.content,
            bookContext,
            extractedAge
          );
        } else {
          // General simplification
          finalContent = vocabularySimplifier.simplifyText(response.content, extractedAge);
        }
        console.log('Applied vocabulary simplification for age:', extractedAge || 'general');
      } catch (error) {
        console.error('Vocabulary simplification failed (non-blocking):', error);
        // Continue with original content if simplification fails
      }
    }

    return NextResponse.json({ 
      response: finalContent,
      usage: response.usage,
      cost: response.cost,
      model: response.model,
      multiAgent: useMultiAgent,
      remainingAnalyses: usageCheck.remainingAnalyses,
      conversationId: conversation?.id,
      ...(useMultiAgent && {
        tutoringAgents: {
          context: response.context?.content,
          insights: response.insights?.content,
          questions: response.questions?.content,
          adaptation: response.adaptation?.content
        },
        teachingMoments: response.teachingMoments,
        followUpQuestions: response.followUpQuestions
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