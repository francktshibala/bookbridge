import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { SubscriptionService } from '@/lib/subscription-service';

export interface UsageCheckResult {
  allowed: boolean;
  reason?: string;
  remainingAnalyses?: number;
  subscription?: any;
  usage?: any;
}

export interface BookAnalysisRequest {
  bookId?: string;
  bookTitle?: string;
  bookSource?: string;
  query?: string;
}

export class UsageTrackingMiddleware {
  /**
   * Check if user can perform a book analysis
   */
  static async checkUsageLimit(userId: string, bookData?: BookAnalysisRequest): Promise<UsageCheckResult> {
    try {
      const result = await SubscriptionService.canAnalyzeBook(
        userId, 
        bookData?.bookSource
      );

      // Also return subscription and usage data for debugging
      const subscription = await SubscriptionService.getUserSubscription(userId);
      const usage = await SubscriptionService.getUserUsage(userId);

      return {
        ...result,
        subscription,
        usage
      };
    } catch (error) {
      console.error('Usage check error:', error);
      return {
        allowed: false,
        reason: 'Unable to verify subscription status'
      };
    }
  }

  /**
   * Track a successful book analysis
   */
  static async trackAnalysis(userId: string, bookData: BookAnalysisRequest): Promise<void> {
    try {
      await SubscriptionService.trackBookAnalysis(
        userId,
        bookData.bookId || 'unknown',
        bookData.bookTitle,
        bookData.bookSource
      );
    } catch (error) {
      console.error('Usage tracking error:', error);
      // Don't throw - tracking failure shouldn't block the response
    }
  }

  /**
   * Extract book information from request context
   */
  static extractBookData(bookId?: string, bookContext?: string): BookAnalysisRequest {
    let bookSource: string | undefined;
    let bookTitle: string | undefined;

    // Determine book source from bookId pattern
    if (bookId) {
      if (bookId.startsWith('gutenberg-')) {
        bookSource = 'gutenberg';
      } else if (bookId.startsWith('openlibrary-')) {
        bookSource = 'openlibrary';
      } else if (bookId.startsWith('standardebooks-')) {
        bookSource = 'standardebooks';
      } else if (bookId.includes('googlebooks') || bookId.startsWith('gbook-')) {
        bookSource = 'googlebooks';
      } else if (bookId.match(/^[0-9a-f-]{36}$/)) {
        bookSource = 'uploaded';
      }
    }

    // Extract book title from context if available
    if (bookContext) {
      const titleMatch = bookContext.match(/Book: (.+?) by /);
      if (titleMatch) {
        bookTitle = titleMatch[1];
      }
    }

    return {
      bookId,
      bookTitle,
      bookSource
    };
  }

  /**
   * Create a usage check response for API endpoints
   */
  static createUsageLimitResponse(result: UsageCheckResult): NextResponse {
    const statusCode = 429; // Too Many Requests

    let message = result.reason || 'Usage limit exceeded';
    
    // Add helpful context for free users
    if (result.reason?.includes('monthly limit')) {
      message += ' Consider upgrading to Premium ($4/month) or Student ($2/month with .edu email) for unlimited access.';
    }

    return NextResponse.json({
      error: message,
      code: 'USAGE_LIMIT_EXCEEDED',
      remainingAnalyses: result.remainingAnalyses || 0,
      upgradeUrl: '/subscription/pricing'
    }, { status: statusCode });
  }

  /**
   * Middleware wrapper for AI endpoints that require usage tracking
   */
  static withUsageTracking<T>(
    handler: (request: NextRequest, context: { 
      userId: string; 
      bookData: BookAnalysisRequest;
      checkResult: UsageCheckResult;
    }) => Promise<T>
  ) {
    return async (request: NextRequest): Promise<T | NextResponse> => {
      try {
        // Get user authentication
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
          return NextResponse.json(
            { error: 'Authentication required' },
            { status: 401 }
          ) as T;
        }

        // Extract request data
        const body = await request.json();
        const { bookId, bookContext, query } = body;
        
        const bookData = this.extractBookData(bookId, bookContext);
        
        // Check usage limits
        const checkResult = await this.checkUsageLimit(user.id, bookData);
        
        if (!checkResult.allowed) {
          return this.createUsageLimitResponse(checkResult) as T;
        }

        // Call the original handler
        const result = await handler(request, {
          userId: user.id,
          bookData,
          checkResult
        });

        // If successful, track the usage (only for successful analyses)
        if (bookId && result && !(result instanceof NextResponse && result.status >= 400)) {
          // Track in background - don't wait for it
          this.trackAnalysis(user.id, bookData).catch(error => {
            console.error('Background usage tracking failed:', error);
          });
        }

        return result;
      } catch (error) {
        console.error('Usage tracking middleware error:', error);
        return NextResponse.json(
          { error: 'Internal server error' },
          { status: 500 }
        ) as T;
      }
    };
  }

  /**
   * Simple check for existing API routes - returns true if allowed to proceed
   */
  static async checkAndTrack(
    userId: string, 
    bookId?: string, 
    bookContext?: string
  ): Promise<{ 
    allowed: boolean; 
    reason?: string; 
    remainingAnalyses?: number;
    shouldTrack: boolean;
  }> {
    const bookData = this.extractBookData(bookId, bookContext);
    const result = await this.checkUsageLimit(userId, bookData);
    
    return {
      allowed: result.allowed,
      reason: result.reason,
      remainingAnalyses: result.remainingAnalyses,
      shouldTrack: result.allowed && !!bookId // Only track if allowed and has bookId
    };
  }

  /**
   * Track usage for successful analysis (call after successful API response)
   */
  static async trackSuccess(
    userId: string, 
    bookId?: string, 
    bookContext?: string
  ): Promise<void> {
    if (!bookId) return; // No tracking without bookId
    
    const bookData = this.extractBookData(bookId, bookContext);
    await this.trackAnalysis(userId, bookData);
  }
}