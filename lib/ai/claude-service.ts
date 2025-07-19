import Anthropic from '@anthropic-ai/sdk';
import { LRUCache } from 'lru-cache';
import { createClient } from 'redis';
import { prisma } from '@/lib/prisma';

interface AIResponse {
  content: string;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  model: string;
  cost: number;
}

interface QueryOptions {
  maxTokens?: number;
  temperature?: number;
  stream?: boolean;
}

export class ClaudeAIService {
  private anthropic: Anthropic;
  private cache: LRUCache<string, AIResponse>;
  private redis?: ReturnType<typeof createClient>;
  
  // Cost per 1K tokens (in USD) - Claude pricing
  private readonly costs = {
    'claude-3-5-haiku-20241022': { input: 0.001, output: 0.005 },
    'claude-3-5-sonnet-20241022': { input: 0.003, output: 0.015 },
    'claude-3-opus-20240229': { input: 0.015, output: 0.075 }
  };

  constructor() {
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY,
    });
    
    this.cache = new LRUCache<string, AIResponse>({ 
      max: 10000,
      ttl: 1000 * 60 * 60 * 24 // 24 hours
    });

    // Initialize Redis if available
    if (process.env.REDIS_URL) {
      console.log('Redis URL found, initializing Redis client');
      this.redis = createClient({ url: process.env.REDIS_URL });
      this.redis.connect().catch(console.error);
    } else {
      console.log('Redis URL not found, skipping Redis initialization');
      this.redis = undefined;
    }
  }

  // Smart model selection based on query complexity
  private selectModel(query: string): string {
    const complexPatterns = [
      /analyze.*literary.*technique/i,
      /compare.*characters/i,
      /explain.*symbolism/i,
      /what.*theme/i,
      /discuss.*meaning/i,
      /interpret.*passage/i,
      /analyze.*style/i,
      /evaluate.*argument/i
    ];

    const isComplex = complexPatterns.some(pattern => pattern.test(query));
    
    // Use Haiku for simple queries, Sonnet for complex ones
    // Opus is too expensive for regular use
    return isComplex ? 'claude-3-5-sonnet-20241022' : 'claude-3-5-haiku-20241022';
  }

  // Generate cache key for query
  private generateCacheKey(prompt: string, bookId?: string): string {
    const normalized = prompt.toLowerCase().trim();
    const key = bookId ? `${bookId}:${normalized}` : normalized;
    return Buffer.from(key).toString('base64');
  }

  // Calculate cost based on usage
  private calculateCost(model: string, usage: { prompt_tokens: number; completion_tokens: number }): number {
    const modelCosts = this.costs[model as keyof typeof this.costs];
    if (!modelCosts) return 0;

    const inputCost = (usage.prompt_tokens / 1000) * modelCosts.input;
    const outputCost = (usage.completion_tokens / 1000) * modelCosts.output;
    
    return inputCost + outputCost;
  }

  // Optimize prompt for minimal tokens
  private optimizePrompt(prompt: string, bookContext?: string): string {
    // System prompt optimized for educational Q&A
    let optimized = `You are an educational AI assistant helping students understand books. 
Provide clear, concise answers that are accessible to users with disabilities. 
Use simple language and structure your responses with headings when helpful.`;

    if (bookContext) {
      // If we have actual book excerpts, emphasize using them
      if (bookContext.includes('Relevant excerpts:') || bookContext.includes('Excerpts:')) {
        optimized = `You are an educational AI assistant helping students understand books.
Answer questions based on the provided book excerpts. Quote relevant passages when appropriate.
Be accurate and only reference information found in the provided text.
Use simple language and structure your responses clearly.

${bookContext}

Question: ${prompt}`;
      } else {
        // Fallback for basic book context (just title/author)
        optimized += `\n\nBook Context: ${bookContext}\n\nQuestion: ${prompt}`;
      }
    } else {
      optimized += `\n\nQuestion: ${prompt}`;
    }

    return optimized;
  }

  // Check usage limits
  private async checkUsageLimits(userId: string): Promise<{ allowed: boolean; reason?: string }> {
    const today = new Date().toISOString().split('T')[0];
    
    // Check user daily limit (handle case where user doesn't exist yet)
    try {
      const userUsage = await prisma.usage.findUnique({
        where: { 
          userId_date: { 
            userId, 
            date: new Date(today) 
          } 
        }
      });

      if (userUsage && userUsage.cost.toNumber() > 10) {
        return { allowed: false, reason: 'Daily user limit exceeded ($10)' };
      }
    } catch (error) {
      // If user doesn't exist in database yet, allow the request
      console.log('User not found in database, allowing request:', userId);
    }

    // Check global daily limit
    const globalUsage = await prisma.systemUsage.findUnique({
      where: { date: new Date(today) }
    });

    if (globalUsage && globalUsage.totalCost.toNumber() > 150) {
      return { allowed: false, reason: 'Daily system limit exceeded ($150)' };
    }

    return { allowed: true };
  }

  // Track usage in database
  private async trackUsage(userId: string, usage: AIResponse['usage'], model: string, cost: number): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    
    // Ensure user exists in Prisma database (sync from Supabase)
    await prisma.user.upsert({
      where: { id: userId },
      update: {},
      create: {
        id: userId,
        email: `user-${userId}@temp.com`, // Temporary email, should be updated with real data
        name: null
      }
    });
    
    // Update user usage
    await prisma.usage.upsert({
      where: { 
        userId_date: { 
          userId, 
          date: new Date(today) 
        } 
      },
      update: {
        queries: { increment: 1 },
        tokens: { increment: usage.total_tokens },
        cost: { increment: cost }
      },
      create: {
        userId,
        date: new Date(today),
        queries: 1,
        tokens: usage.total_tokens,
        cost: cost
      }
    });

    // Update system usage
    await prisma.systemUsage.upsert({
      where: { date: new Date(today) },
      update: {
        totalQueries: { increment: 1 },
        totalTokens: { increment: usage.total_tokens },
        totalCost: { increment: cost }
      },
      create: {
        date: new Date(today),
        totalQueries: 1,
        totalTokens: usage.total_tokens,
        totalCost: cost,
        activeUsers: 1
      }
    });
  }

  // Main query method
  async query(
    prompt: string, 
    options: QueryOptions & { userId: string; bookId?: string; bookContext?: string } = {} as any
  ): Promise<AIResponse> {
    console.log('Claude query method called');
    const { userId, bookId, bookContext, maxTokens = 300, temperature = 0.7 } = options;

    // Check usage limits
    console.log('Checking usage limits for user:', userId);
    const usageCheck = await this.checkUsageLimits(userId);
    console.log('Usage check result:', usageCheck);
    if (!usageCheck.allowed) {
      throw new Error(usageCheck.reason);
    }

    // Check cache first
    console.log('Generating cache key...');
    const cacheKey = this.generateCacheKey(prompt, bookId);
    console.log('Cache key generated');
    
    // Try Redis cache first
    if (this.redis && process.env.REDIS_URL) {
      console.log('Checking Redis cache...');
      try {
        const cached = await this.redis.get(cacheKey);
        if (cached) {
          console.log('Found in Redis cache');
          return JSON.parse(cached);
        }
        console.log('Not found in Redis cache');
      } catch (error) {
        console.error('Redis cache error:', error);
      }
    } else {
      console.log('Redis disabled, skipping Redis cache check');
    }

    // Try local cache
    console.log('Checking local cache...');
    const localCached = this.cache.get(cacheKey);
    if (localCached) {
      console.log('Found in local cache');
      return localCached;
    }
    console.log('Not found in local cache');

    // Select model and optimize prompt
    console.log('Selecting model and optimizing prompt...');
    const model = this.selectModel(prompt);
    const optimizedPrompt = this.optimizePrompt(prompt, bookContext);
    console.log('Model selected:', model, 'Prompt optimized');

    try {
      console.log('Making Claude API call with model:', model);
      console.log('Prompt length:', optimizedPrompt.length);
      
      const response = await Promise.race([
        this.anthropic.messages.create({
          model,
          messages: [{ role: 'user', content: optimizedPrompt }],
          max_tokens: maxTokens,
          temperature,
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('API call timeout')), 30000)
        )
      ]) as Anthropic.Messages.Message;
      
      console.log('Claude API response received');

      // Calculate usage from response
      const usage = {
        prompt_tokens: response.usage.input_tokens,
        completion_tokens: response.usage.output_tokens,
        total_tokens: response.usage.input_tokens + response.usage.output_tokens
      };
      
      const cost = this.calculateCost(model, usage);
      
      const aiResponse: AIResponse = {
        content: response.content[0].type === 'text' ? response.content[0].text : '',
        usage,
        model,
        cost
      };

      // Cache the response
      this.cache.set(cacheKey, aiResponse);
      
      // Cache in Redis with 30-day TTL
      if (this.redis) {
        try {
          await this.redis.setex(cacheKey, 30 * 24 * 60 * 60, JSON.stringify(aiResponse));
        } catch (error) {
          console.error('Redis cache set error:', error);
        }
      }

      // Track usage (with error handling)
      try {
        await this.trackUsage(userId, usage, model, cost);
      } catch (usageError) {
        console.error('Usage tracking error (non-critical):', usageError);
        // Continue without failing the request
      }

      return aiResponse;
    } catch (error) {
      console.error('Claude API error:', error);
      throw new Error('AI service temporarily unavailable');
    }
  }

  // Streaming query method for real-time responses
  async *queryStream(
    prompt: string,
    options: QueryOptions & { userId: string; bookId?: string; bookContext?: string } = {} as any
  ): AsyncGenerator<string, void, unknown> {
    const { userId, bookId, bookContext, maxTokens = 300, temperature = 0.7 } = options;

    // Check usage limits
    const usageCheck = await this.checkUsageLimits(userId);
    if (!usageCheck.allowed) {
      throw new Error(usageCheck.reason);
    }

    // Check cache first
    const cacheKey = this.generateCacheKey(prompt, bookId);
    const cached = this.cache.get(cacheKey);
    if (cached) {
      yield cached.content;
      return;
    }

    const model = this.selectModel(prompt);
    const optimizedPrompt = this.optimizePrompt(prompt, bookContext);

    try {
      const stream = await this.anthropic.messages.stream({
        model,
        messages: [{ role: 'user', content: optimizedPrompt }],
        max_tokens: maxTokens,
        temperature,
      });

      let fullContent = '';

      for await (const chunk of stream) {
        if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
          const content = chunk.delta.text;
          fullContent += content;
          yield content;
        }
      }

      // Get final usage from the stream
      const finalMessage = await stream.finalMessage();
      const usage = {
        prompt_tokens: finalMessage.usage.input_tokens,
        completion_tokens: finalMessage.usage.output_tokens,
        total_tokens: finalMessage.usage.input_tokens + finalMessage.usage.output_tokens
      };

      // Cache and track the complete response
      const cost = this.calculateCost(model, usage);
      const aiResponse: AIResponse = {
        content: fullContent,
        usage,
        model,
        cost
      };

      this.cache.set(cacheKey, aiResponse);
      await this.trackUsage(userId, usage, model, cost);

    } catch (error) {
      console.error('Claude streaming error:', error);
      throw new Error('AI service temporarily unavailable');
    }
  }

  // Get usage statistics
  async getUsageStats(userId: string): Promise<{
    daily: { queries: number; tokens: number; cost: number };
    monthly: { queries: number; tokens: number; cost: number };
  }> {
    const today = new Date().toISOString().split('T')[0];
    const thisMonth = new Date().toISOString().slice(0, 7);

    try {
      const dailyUsage = await prisma.usage.findUnique({
        where: { 
          userId_date: { 
            userId, 
            date: new Date(today) 
          } 
        }
      });

      const monthlyUsage = await prisma.usage.aggregate({
        where: {
          userId,
          date: {
            gte: new Date(`${thisMonth}-01`),
            lt: new Date(`${thisMonth}-31`)
          }
        },
        _sum: {
          queries: true,
          tokens: true,
          cost: true
        }
      });

      return {
        daily: {
          queries: dailyUsage?.queries || 0,
          tokens: dailyUsage?.tokens || 0,
          cost: dailyUsage?.cost.toNumber() || 0
        },
        monthly: {
          queries: monthlyUsage._sum.queries || 0,
          tokens: monthlyUsage._sum.tokens || 0,
          cost: monthlyUsage._sum.cost?.toNumber() || 0
        }
      };
    } catch (error) {
      console.error('Error getting usage stats:', error);
      // Return zero stats if user doesn't exist or other error
      return {
        daily: { queries: 0, tokens: 0, cost: 0 },
        monthly: { queries: 0, tokens: 0, cost: 0 }
      };
    }
  }
}

// Export singleton instance
export const claudeService = new ClaudeAIService();